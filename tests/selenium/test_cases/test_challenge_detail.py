from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("CTF_URL")

CHALLENGE_URL = f"{BASE_URL}/challenges/web-101/"

def test_challenge_detail_loads(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "h1"))
    )

    assert logged_in_browser.find_element(By.XPATH, "//h1[contains(text(),'Basic Web Exploit')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'EASY')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'Web Exploitation')]")
    assert logged_in_browser.find_element(By.XPATH, "//*[contains(text(),'100')]")

def test_challenge_detail_flag_form(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.ID, "flag"))
    )

    assert logged_in_browser.find_element(By.ID, "flag")
    assert logged_in_browser.find_element(By.CSS_SELECTOR, "button[type=submit]")

def test_challenge_back_button(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//a[contains(text(),'Back to Challenges')]"))
    )

    logged_in_browser.find_element(By.XPATH, "//a[contains(text(),'Back to Challenges')]").click()

    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h1[contains(text(),'Challenges')]"))
    )

    assert "/challenges" in logged_in_browser.current_url

def test_flag_submit_wrong(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    flag_input = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.ID, "flag"))
    )
    flag_input.clear()
    flag_input.send_keys("flag{wrong_flag}")

    logged_in_browser.find_element(By.CSS_SELECTOR, "button[type=submit]").click()

    error = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "p.text-destructive"))
    )

    assert "Incorrect" in error.text

def test_flag_submit_already_submitted(logged_in_browser):
    logged_in_browser.get(CHALLENGE_URL)

    flag_input = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.ID, "flag"))
    )
    flag_input.clear()
    flag_input.send_keys("flag{leet_xss}")

    logged_in_browser.find_element(By.CSS_SELECTOR, "button[type=submit]").click()

    error = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "p.text-destructive"))
    )

    assert "already submitted" in error.text