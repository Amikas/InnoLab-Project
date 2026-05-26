from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import requests
import os
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")
CHALLENGE_URL = f"{BASE_URL}/challenges/web-101/"

def test_download_button_visible(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    button = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'Download Challenge File')]"))
    )

    assert button.is_displayed()
    assert not button.get_attribute("disabled")

def test_download_endpoint_reachable(logged_in_browser):
    cookies = {c['name']: c['value'] for c in logged_in_browser.get_cookies()}

    response = requests.head(
        f"{BASE_URL}/api/challenges/web-101/download/",
        cookies=cookies
    )

    assert response.status_code == 200