import io

from app import config

from .test_applications import create_application

PDF_BYTES = b"%PDF-1.4 fake resume content"


def upload(client, app_id, filename="resume.pdf", content=PDF_BYTES, file_type="resume"):
    return client.post(
        f"/api/applications/{app_id}/attachments",
        files={"file": (filename, io.BytesIO(content), "application/pdf")},
        data={"file_type": file_type},
    )


def test_upload_and_download_round_trip(client):
    application = create_application(client)
    response = upload(client, application["id"])
    assert response.status_code == 201, response.text
    attachment = response.json()
    assert attachment["filename"] == "resume.pdf"
    assert attachment["file_type"] == "resume"
    assert attachment["size_bytes"] == len(PDF_BYTES)

    download = client.get(f"/api/attachments/{attachment['id']}/download")
    assert download.status_code == 200
    assert download.content == PDF_BYTES
    assert "resume.pdf" in download.headers["content-disposition"]


def test_docx_upload_allowed(client):
    application = create_application(client)
    response = upload(client, application["id"], filename="cover.docx", file_type="cover_letter")
    assert response.status_code == 201


def test_unsupported_extension_rejected(client):
    application = create_application(client)
    response = upload(client, application["id"], filename="malware.exe")
    assert response.status_code == 415
    assert client.get(f"/api/applications/{application['id']}").json()["attachments"] == []


def test_oversize_upload_rejected(client):
    application = create_application(client)
    too_big = b"x" * (config.MAX_UPLOAD_BYTES + 1)
    response = upload(client, application["id"], content=too_big)
    assert response.status_code == 413
    # nothing left on disk
    app_dir = config.UPLOADS_DIR / str(application["id"])
    assert not app_dir.exists() or not any(app_dir.iterdir())


def test_invalid_file_type_field_rejected(client):
    application = create_application(client)
    response = client.post(
        f"/api/applications/{application['id']}/attachments",
        files={"file": ("resume.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
        data={"file_type": "diploma"},
    )
    assert response.status_code == 422


def test_stored_under_uuid_not_client_filename(client):
    application = create_application(client)
    upload(client, application["id"], filename="../../evil.pdf")
    app_dir = config.UPLOADS_DIR / str(application["id"])
    names = [p.name for p in app_dir.iterdir()]
    assert len(names) == 1
    assert names[0].endswith(".pdf")
    assert "evil" not in names[0]
    # nothing escaped the uploads dir
    assert not (config.UPLOADS_DIR.parent / "evil.pdf").exists()


def test_delete_attachment_removes_file(client):
    application = create_application(client)
    attachment = upload(client, application["id"]).json()
    app_dir = config.UPLOADS_DIR / str(application["id"])
    assert any(app_dir.iterdir())

    assert client.delete(f"/api/attachments/{attachment['id']}").status_code == 204
    assert client.get(f"/api/attachments/{attachment['id']}/download").status_code == 404
    assert not any(app_dir.iterdir())


def test_deleting_application_cleans_up_files(client):
    application = create_application(client)
    upload(client, application["id"])
    app_dir = config.UPLOADS_DIR / str(application["id"])
    assert any(app_dir.iterdir())

    assert client.delete(f"/api/applications/{application['id']}").status_code == 204
    assert not app_dir.exists()


def test_attachment_404s(client):
    assert client.get("/api/attachments/999/download").status_code == 404
    assert client.delete("/api/attachments/999").status_code == 404
    response = client.post(
        "/api/applications/999/attachments",
        files={"file": ("resume.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
    )
    assert response.status_code == 404
