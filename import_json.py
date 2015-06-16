#!/usr/bin/env python
import bs4
import json
import os
import requests
import sys


URLS_PREFIX = 'https://en.babolatplay.com'
LOGIN_PAGE_URL = URLS_PREFIX + '/login'
LOGIN_URL = URLS_PREFIX + '/login_check'
JSON_URL = URLS_PREFIX + '/sessions/evolution.json'
USERNAME = os.environ['PLAY_USERMAIL']
PASSWORD = os.environ['PLAY_PASSWORD']


class ParseError(Exception):
    pass


class CredentialError(Exception):
    pass

def login(player_name):
    response = requests.get(LOGIN_PAGE_URL)
    cookies = response.cookies
    soup = bs4.BeautifulSoup(response.content)
    form = soup.find('form')
    if not form:
        raise ParseError('Can not find form in login page :(')
    csrf_token = form.find('input', attrs={'name': '_csrf_token'})
    if not csrf_token:
        raise ParseError('Can not find csrf token in login page form :(')
    data = {
        '_csrf_token': csrf_token['value'],
        '_username': USERNAME,
        '_password': PASSWORD,
    }
    response = requests.post(LOGIN_URL, data=data, cookies=cookies,
                             allow_redirects=False)
    cookies = response.cookies

    if len(cookies) == 0:
        raise CredentialError('Could not login with credentials')

    content = requests.get(JSON_URL, cookies=cookies).content
    try:
        data = json.loads(content)
        content = json.dumps(data, indent=4)
    except ValueError:
        raise
    json_file = open('evolution_%s.json' % player_name, 'w')
    json_file.write(content)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print ('Usage: PLAY_PASSWORD=pass PLAY_USERMAIL=mail %s <player_name>'
               % __file__)
        sys.exit(1)
    login(sys.argv[1])
