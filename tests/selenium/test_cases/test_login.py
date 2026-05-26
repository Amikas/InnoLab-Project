from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dotenv import load_dotenv
import os

load_dotenv()

BASE_URL = os.getenv("CTF_URL")


def test_login_page_loads(browser):
    browser.get(f"{BASE_URL}/login")

    assert browser.find_element(By.ID, "username")
    assert browser.find_element(By.ID, "password")
    assert browser.find_element(By.CSS_SELECTOR, "button[type=submit]")

def test_login_failed(browser):
    browser.get(f"{BASE_URL}/login")

    browser.find_element(By.ID, "username").send_keys("wrongUser")
    browser.find_element(By.ID, "password").send_keys("wrongPassword")

    WebDriverWait(browser, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type=submit]"))
    ).click()
    
    error = WebDriverWait(browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "p.text-destructive"))
    )

    assert browser.current_url == f"{BASE_URL}/login/"
    assert "Invalid username or passwor" in error.text

def test_login_successful(logged_in_browser):
    assert logged_in_browser.find_element(By.XPATH, "//button[text()='Logout']")