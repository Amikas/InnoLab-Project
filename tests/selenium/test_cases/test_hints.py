from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")

# Challenge mit Hints
CHALLENGE_URL = f"{BASE_URL}/challenges/crypto-101/"

def test_hints_section_visible(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(),'Hints')]"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//h2[contains(text(),'Hints')]")

def test_revealed_hints_show_content(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Revealed')]"))
    )

    revealed = logged_in_browser.find_elements(By.XPATH, "//*[contains(text(),'Revealed')]")
    assert len(revealed) > 0

def test_unrevealed_hint_shows_button(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(text(),'Reveal')]"))
    )

    reveal_button = logged_in_browser.find_element(By.XPATH, "//button[contains(text(),'Reveal')]")
    assert reveal_button.is_displayed()