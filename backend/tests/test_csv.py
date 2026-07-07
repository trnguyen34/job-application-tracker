import io

from .test_applications import VALID_APPLICATION, create_application


def import_csv(client, text: str):
    return client.post(
        "/api/import/csv",
        files={"file": ("import.csv", io.BytesIO(text.encode()), "text/csv")},
    )


def test_export_round_trips_through_import(client):
    create_application(client)
    create_application(
        client, company="Beta Inc", role="SRE", status="wishlist", applied_date=None
    )

    export = client.get("/api/export/csv")
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("text/csv")
    csv_text = export.text
    assert "Acme Corp" in csv_text
    assert "Beta Inc" in csv_text

    # wipe by deleting both, then re-import the exported file
    for app in client.get("/api/applications").json():
        client.delete(f"/api/applications/{app['id']}")
    assert client.get("/api/applications").json() == []

    result = import_csv(client, csv_text).json()
    assert result == {"imported": 2, "skipped": [], "warnings": []}

    apps = {a["company"]: a for a in client.get("/api/applications").json()}
    assert apps["Acme Corp"]["role"] == VALID_APPLICATION["role"]
    assert apps["Acme Corp"]["status"] == "applied"
    assert apps["Acme Corp"]["salary_min"] == 150000
    assert apps["Beta Inc"]["status"] == "wishlist"


def test_import_with_aliased_headers(client):
    result = import_csv(
        client,
        "Company Name,Job Title,Stage,Date Applied,Found Via\n"
        "Acme,Engineer,Applied,2026-06-01,LinkedIn\n",
    ).json()
    assert result["imported"] == 1
    app = client.get("/api/applications").json()[0]
    assert app["company"] == "Acme"
    assert app["role"] == "Engineer"
    assert app["status"] == "applied"
    assert app["source"] == "LinkedIn"


def test_import_unknown_status_defaults_to_wishlist_with_warning(client):
    result = import_csv(
        client, "company,role,status\nAcme,Engineer,Talking To Them\n"
    ).json()
    assert result["imported"] == 1
    assert len(result["warnings"]) == 1
    assert client.get("/api/applications").json()[0]["status"] == "wishlist"


def test_import_skips_bad_rows_and_keeps_good_ones(client):
    result = import_csv(
        client,
        "company,role,salary_min\n"
        "Acme,Engineer,100000\n"
        ",Missing Company,50\n"
        "Beta,,50\n"
        "Gamma,Analyst,not-a-number\n",
    ).json()
    assert result["imported"] == 1
    assert len(result["skipped"]) == 3
    rows = [s["row"] for s in result["skipped"]]
    assert rows == [3, 4, 5]
    assert len(client.get("/api/applications").json()) == 1


def test_import_requires_company_and_role_columns(client):
    result = import_csv(client, "foo,bar\n1,2\n").json()
    assert result["imported"] == 0
    assert "Missing required columns" in result["skipped"][0]["reason"]


def test_import_rejects_non_utf8(client):
    response = client.post(
        "/api/import/csv",
        files={"file": ("import.csv", io.BytesIO(b"\xff\xfe\x00bad"), "text/csv")},
    )
    assert response.status_code == 415
