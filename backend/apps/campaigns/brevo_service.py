"""
Brevo (Sendinblue) API service for email marketing campaigns.
Docs: https://developers.brevo.com/reference/
"""

import requests

BREVO_API = "https://api.brevo.com/v3"


class BrevoError(Exception):
    pass


class BrevoService:
    def __init__(self, api_key: str):
        self.headers = {
            "accept":       "application/json",
            "content-type": "application/json",
            "api-key":      api_key,
        }

    def _post(self, path: str, payload: dict) -> dict:
        r = requests.post(f"{BREVO_API}{path}", json=payload, headers=self.headers, timeout=30)
        if not r.ok:
            msg = r.json().get("message", f"Brevo error {r.status_code}")
            raise BrevoError(msg)
        return r.json() if r.content else {}

    def _get(self, path: str) -> dict:
        r = requests.get(f"{BREVO_API}{path}", headers=self.headers, timeout=30)
        if not r.ok:
            msg = r.json().get("message", f"Brevo error {r.status_code}")
            raise BrevoError(msg)
        return r.json()

    def create_or_update_contact(self, email: str, first_name: str = "", last_name: str = "") -> None:
        """Create or update a contact in Brevo."""
        payload = {
            "email": email,
            "attributes": {"FIRSTNAME": first_name or "", "LASTNAME": last_name or ""},
            "updateEnabled": True,
        }
        r = requests.post(f"{BREVO_API}/contacts", json=payload, headers=self.headers, timeout=30)
        # 201 = created, 204 = updated, both OK. Ignore "already exists" errors.
        if r.status_code not in (201, 204) and r.ok is False:
            data = r.json() if r.content else {}
            if "already exist" not in data.get("message", "").lower():
                raise BrevoError(data.get("message", f"Brevo error {r.status_code}"))

    def create_list(self, name: str) -> int:
        """Create a contact list in Brevo folder 1 (default). Returns list ID."""
        data = self._post("/contacts/lists", {"name": name, "folderId": 1})
        return data["id"]

    def delete_list(self, list_id: int) -> None:
        """Delete a Brevo list (best-effort cleanup)."""
        requests.delete(f"{BREVO_API}/contacts/lists/{list_id}", headers=self.headers, timeout=15)

    def add_contacts_to_list(self, list_id: int, emails: list) -> None:
        """Add contacts to a list in chunks of 150 (Brevo limit per call)."""
        chunk_size = 150
        for i in range(0, len(emails), chunk_size):
            chunk = emails[i : i + chunk_size]
            requests.post(
                f"{BREVO_API}/contacts/lists/{list_id}/contacts/add",
                json={"emails": chunk},
                headers=self.headers,
                timeout=30,
            )
            # Brevo returns 400 if contacts don't exist yet — that's OK, we ignore it.

    def create_campaign(
        self,
        name: str,
        subject: str,
        from_name: str,
        from_email: str,
        html_content: str,
        list_id: int,
        preview_text: str = "",
    ) -> int:
        """Create an email campaign in Brevo. Returns the Brevo campaign ID."""
        payload = {
            "name":         name,
            "subject":      subject,
            "sender":       {"name": from_name, "email": from_email},
            "type":         "classic",
            "htmlContent":  html_content,
            "recipients":   {"listIds": [list_id]},
        }
        if preview_text:
            payload["previewText"] = preview_text
        data = self._post("/emailCampaigns", payload)
        return data["id"]

    def send_campaign_now(self, campaign_id: int) -> None:
        """Trigger immediate send of a Brevo campaign."""
        r = requests.post(
            f"{BREVO_API}/emailCampaigns/{campaign_id}/sendNow",
            headers=self.headers,
            timeout=30,
        )
        if not r.ok:
            data = r.json() if r.content else {}
            raise BrevoError(data.get("message", f"Brevo error {r.status_code}"))

    def get_campaign_stats(self, campaign_id: int) -> dict:
        """Fetch campaign statistics from Brevo."""
        data = self._get(f"/emailCampaigns/{campaign_id}")
        global_stats = data.get("statistics", {}).get("globalStats", {})
        return {
            "delivered":     global_stats.get("delivered", 0),
            "opens":         global_stats.get("uniqueViews", 0),
            "clicks":        global_stats.get("uniqueClicks", 0),
            "unsubscribes":  global_stats.get("unsubscriptions", 0),
            "bounces":       global_stats.get("hardBounces", 0) + global_stats.get("softBounces", 0),
        }
