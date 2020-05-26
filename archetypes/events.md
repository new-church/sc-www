---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
eventStart: {{ (now.AddDate 0 1 0).Format "2006-01-02T15:04:05-07:00" }}
eventEnd: {{ (now.AddDate 0 1 0).Format "2006-01-02T15:04:05-07:00" }}
draft: true
---

** insert event details here **