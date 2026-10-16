from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")

def test_scoreboard_page_loads(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/scoreboard")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h1[contains(text(),'Scoreboard')]"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//h1[contains(text(),'Scoreboard')]")

def test_scoreboard_table_visible(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/scoreboard")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "table"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//th[contains(text(),'Rank')]")
    assert logged_in_browser.find_element(By.XPATH, "//th[contains(text(),'Username')]")
    assert logged_in_browser.find_element(By.XPATH, "//th[contains(text(),'Score')]")
    assert logged_in_browser.find_element(By.XPATH, "//th[contains(text(),'Solved')]")

def test_scoreboard_has_entries(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/scoreboard")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "tbody tr"))
    )

    rows = logged_in_browser.find_elements(By.CSS_SELECTOR, "tbody tr")
    assert len(rows) > 0

def test_scoreboard_top3_visible(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/scoreboard")

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "tbody tr"))
    )

    # Direkt auf den span mit text-primary zugreifen
    ranks = logged_in_browser.find_elements(By.CSS_SELECTOR, "span.text-primary")
    rank_texts = [r.text for r in ranks]

    assert "#1" in rank_texts
    assert "#2" in rank_texts
    assert "#3" in rank_texts