import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dotenv import load_dotenv
import os

load_dotenv()

USERNAME = os.getenv("CTF_USERNAME")
PASSWORD = os.getenv("CTF_PASSWORD")
BASE_URL = os.getenv("CTF_URL")

@pytest.fixture(scope="session")
def browser():
    driver = webdriver.Firefox()
    yield driver
    driver.quit()

@pytest.fixture(scope="session")
def logged_in_browser():
    driver = webdriver.Firefox()
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