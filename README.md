# dovecot-log-scrapper

### Requirements

- node v0.11
- npm

### How to

- ``npm install``
- ``node index.js /path/to/file.log``
- The optional env variables are : HOST, DB, USER and PASS. Example : ``HOST=localhost DB=master node index.js /path/to/file.log``

### Note

- The log file should have date format like ``2015-12-28T17:13:41.290881+07:00``. Example :

<pre>
2015-12-28T17:13:51.289892+07:00 mailgw [dovecot]	 info	:  imap-login: Login: user=<username@somedomain.com>, method=PLAIN, rip=1.1.1.1, lip=1.1.1.2, mpid=5372, session=<y7zAj/In7wAKHwJO>
</pre>
