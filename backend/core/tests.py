from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, SimpleTestCase, TestCase


class BackendRootTests(SimpleTestCase):
    def test_root_redirects_to_admin(self):
        self.assertRedirects(self.client.get("/"), "/admin/", fetch_redirect_response=False)

    def test_api_routes_remain_available(self):
        self.assertEqual(self.client.get("/api/auth/user/").status_code, 401)


class AdminCsrfTests(TestCase):
    databases = {"default", "auth_db"}

    @classmethod
    def setUpTestData(cls):
        get_user_model().objects.db_manager("auth_db").create_superuser(
            username="admin", email="admin@example.test", password="admin-test-password"
        )

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        response = self.client.get("/admin/login/", HTTP_HOST="localhost:8000")
        self.assertEqual(response.status_code, 200)
        self.login_data = {
            "username": "admin",
            "password": "admin-test-password",
            "next": "/admin/",
            "csrfmiddlewaretoken": self.client.cookies[settings.CSRF_COOKIE_NAME].value,
        }

    def login(self, origin, data=None):
        # Simulate HTTPS terminated by port forwarding before reaching runserver.
        return self.client.post(
            "/admin/login/",
            self.login_data if data is None else data,
            HTTP_HOST="localhost:8000",
            HTTP_ORIGIN=origin,
        )

    def test_https_localhost_admin_login_accepts_valid_csrf_token(self):
        response = self.login("https://localhost:8000")
        self.assertRedirects(response, "/admin/", fetch_redirect_response=False)
        self.assertEqual(self.client.get("/admin/", HTTP_HOST="localhost:8000").status_code, 200)

    def test_admin_login_rejects_untrusted_origins(self):
        for origin in ("https://untrusted.example", "https://localhost:8001"):
            with self.subTest(origin=origin):
                self.assertEqual(self.login(origin).status_code, 403)

    def test_trusted_origin_still_requires_csrf_token(self):
        data = {key: value for key, value in self.login_data.items() if key != "csrfmiddlewaretoken"}
        self.assertEqual(self.login("https://localhost:8000", data).status_code, 403)
