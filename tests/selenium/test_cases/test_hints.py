from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")
API_URL = os.getenv("CTF_API_URL", "http://localhost:8080")


def _challenge_with_hints():
    # Pick a seeded challenge that actually has hints instead of assuming
    # a hardcoded crypto-101 challenge exists.
    challenges = requests.get(f"{API_URL}/api/challenges", timeout=15).json()
    for challenge in challenges:
        detail = requests.get(f"{API_URL}/api/challenges/{challenge['id']}", timeout=15).json()
        if detail.get("hints"):
            return detail["id"]
    return None


def _hints_url():
    challenge_id = _challenge_with_hints()
    if challenge_id is None:
        pytest.skip("no seeded challenge with hints available")
    return f"{BASE_URL}/challenges/{challenge_id}/"

def test_hints_section_visible(logged_in_browser):
    logged_in_browser.get(_hints_url())

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(),'Hints')]"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//h2[contains(text(),'Hints')]")

def test_revealed_hints_show_content(logged_in_browser):
    logged_in_browser.get(_hints_url())

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Revealed')]"))
    )

    revealed = logged_in_browser.find_elements(By.XPATH, "//*[contains(text(),'Revealed')]")
    assert len(revealed) > 0

def test_unrevealed_hint_shows_button(logged_in_browser):
    logged_in_browser.get(_hints_url())

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(text(),'Reveal')]"))
    )

    reveal_button = logged_in_browser.find_element(By.XPATH, "//button[contains(text(),'Reveal')]")
    assert reveal_button.is_displayed()