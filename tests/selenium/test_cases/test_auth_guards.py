from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")

def test_protected_routes_redirect_to_login(browser):
    browser.get(f"{BASE_URL}/challenges")
    WebDriverWait(browser, 10).until(EC.url_contains("/login"))
    assert "/login" in browser.current_url

def test_challenge_detail_redirects_to_login(browser):
    browser.get(f"{BASE_URL}/challenges/web-101/")
    WebDriverWait(browser, 10).until(EC.url_contains("/login"))
    assert "/login" in browser.current_url

def test_admin_redirects_without_login(browser):
    browser.get(f"{BASE_URL}/admin")
    WebDriverWait(browser, 10).until(EC.url_changes(f"{BASE_URL}/admin/"))
    assert "/admin" not in browser.current_url

def test_profile_redirects_to_login(browser):
    browser.get(f"{BASE_URL}/profile")
    WebDriverWait(browser, 10).until(EC.url_contains("/login"))
    assert "/login" in browser.current_url