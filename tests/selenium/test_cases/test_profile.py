from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")

def test_profile_page_loads(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/profile")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "h1"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'Member since')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'Rank')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'@')]")

def test_profile_stats_visible(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/profile")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "h1"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'Points')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'Solved')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'Streak')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'Time')]")

def test_profile_recent_submissions_visible(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/profile")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(),'Recent Submissions')]"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//h2[contains(text(),'Recent Submissions')]")

    entries = logged_in_browser.find_elements(By.CSS_SELECTOR, "div.space-y-2 > div")
    assert len(entries) > 0

def test_profile_view_all_link(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/profile")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//a[contains(text(),'View all')]"))
    )

    link = logged_in_browser.find_element(By.XPATH, "//a[contains(text(),'View all')]")
    assert "/challenges" in link.get_attribute("href")