# coding=utf8
#import sys
#reload(sys)
#sys.setdefaultencoding('utf8')
import json
import sys
from selenium import webdriver
#from pyvirtualdisplay import Display
from time import sleep
import time
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
#display = Display(visible=0, size=(1920,1080))
#display.start()
d = DesiredCapabilities.CHROME
d['loggingPrefs'] = { 'browser':'ALL' }
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--window-size=800x600')
chrome_options.add_argument('--disable-gpu')
#chrome_options.add_argument('--headless')
chrome_options.add_argument('--autoplay-policy')
chrome_options.add_argument('--ignore-certificate-errors')
#chrome_options.add_argument('--enable-quic')
#chrome_options.add_argument('--quic-version=h3-Q043')
chrome_options.add_argument('--allow-file-access-from-files')
chrome_options.add_argument('--disable cache')
chrome_options.add_argument('--ignore-autoplay-restrictions')
#chrome_options.add_argument('--user-data-dir=/home/renren/html1/chromeUserData/tmp2')
browser = webdriver.Chrome(desired_capabilities=d,options=chrome_options)
sleep(1)
#browser.get('https://www.baidu.com')
browser.get('C:/Users/USER/Desktop/实验数据/html1/html/mpc.html')
#browser.find_element_by_xpath("//button[@id='load']").click()
sleep(500)
#info=[]
#for entry in browser.get_log('browser'):
#    print(entry)
browser.quit()
#display.stop()
