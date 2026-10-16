from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import requests
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")
API_URL = os.getenv("CTF_API_URL", "http://localhost:8080")

def test_challenges_page_loads(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/challenges")
    
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "h1"))
    )
    
    assert logged_in_browser.find_element(By.XPATH, "//h1[contains(text(),'Challenges')]")
    assert logged_in_browser.find_element(By.CSS_SELECTOR, "input[placeholder='Search challenges...']")
    
    selects = logged_in_browser.find_elements(By.TAG_NAME, "select")
    assert len(selects) == 2

def test_challenges_cards_visible(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/challenges")
    
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/challenges/']"))
    )
    
    cards = logged_in_browser.find_elements(By.CSS_SELECTOR, "a[href*='/challenges/']")
    assert len(cards) > 0

def test_challenge_filter_by_difficulty(logged_in_browser):
    logged_in_browser.get(f"{BASE_URL}/challenges")

    # NOTE: generous timeout, the dev backend can be slow under suite load.
    difficulty_select = WebDriverWait(logged_in_browser, 30).until(
        EC.element_to_be_clickable((By.XPATH, "//select[option[text()='All Difficulties']]"))
    )
    difficulty_select.find_element(By.XPATH, "//option[@value='easy']").click()
    
    import time
    time.sleep(1)

    easy = logged_in_browser.find_elements(By.XPATH, "//*[text()='EASY']")
    hard = logged_in_browser.find_elements(By.XPATH, "//*[text()='HARD']")
    
    assert len(easy) > 0
    assert len(hard) == 0

def test_challenge_search(logged_in_browser):
    # Search term is derived from seeded data so the test does not depend on
    # a hardcoded challenge title.
    challenges = requests.get(f"{API_URL}/api/challenges", timeout=15).json()
    assert len(challenges) > 0
    term = challenges[0]["title"].split()[0]
    excluded = [c["title"] for c in challenges if term.lower() not in c["title"].lower()]

    logged_in_browser.get(f"{BASE_URL}/challenges")

    # NOTE: generous timeouts, the dev backend can be slow under suite load.
    WebDriverWait(logged_in_browser, 30).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/challenges/'] h3"))
    )

    search_field = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder='Search challenges...']"))
    )
    search_field.send_keys(term)

    if excluded:
        WebDriverWait(logged_in_browser, 30).until(
            EC.invisibility_of_element_located((By.XPATH, f"//h3[contains(text(),'{excluded[0]}')]"))
        )

    cards = logged_in_browser.find_elements(By.CSS_SELECTOR, "a[href*='/challenges/'] h3")
    titles = [card.text for card in cards]

    assert len(titles) > 0
    assert all(term.lower() in title.lower() for title in titles)