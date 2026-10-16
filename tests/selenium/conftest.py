import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dotenv import load_dotenv
import os

load_dotenv()

USERNAME = os.getenv("CTF_USERNAME")
PASSWORD = os.getenv("CTF_PASSWORD")
BASE_URL = os.getenv("CTF_URL")


def _make_driver():
    opts = Options()
    if os.getenv("HEADLESS", "true").lower() in ("1", "true", "yes"):
        opts.add_argument("--headless")
    binary = os.getenv("FIREFOX_BINARY", "/snap/firefox/current/usr/lib/firefox/firefox")
    if binary and os.path.exists(binary):
        opts.binary_location = binary
    svc_path = os.getenv("GECKODRIVER_PATH", "/snap/bin/geckodriver")
    svc = Service(svc_path) if svc_path and os.path.exists(svc_path) else Service()
    return webdriver.Firefox(options=opts, service=svc)

@pytest.fixture(scope="session")
def browser():
    driver = _make_driver()
    yield driver
    driver.quit()

@pytest.fixture(scope="session")
def logged_in_browser():
    driver = _make_driver()
    driver.get(f"{BASE_URL}/login")

    driver.find_element(By.ID, "username").send_keys(USERNAME)
    driver.find_element(By.ID, "password").send_keys(PASSWORD)

    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type=submit]"))
    ).click()

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//button[text()='Logout']"))
    )

    yield driver
    driver.quit()