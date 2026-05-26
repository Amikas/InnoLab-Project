from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")

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

    difficulty_select = WebDriverWait(logged_in_browser, 10).until(
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
    logged_in_browser.get(f"{BASE_URL}/challenges")
    
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/challenges/'] h3"))
    )
    
    search_field = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder='Search challenges...']"))
    )
    search_field.send_keys("CrackMe")
    
    WebDriverWait(logged_in_browser, 10).until(
        EC.invisibility_of_element_located((By.XPATH, "//h3[contains(text(),'Basic Web Exploit')]"))
    )
    
    cards = logged_in_browser.find_elements(By.CSS_SELECTOR, "a[href*='/challenges/'] h3")
    titles = [card.text for card in cards]
    
    assert len(titles) > 0
    assert all("CrackMe" in title for title in titles)