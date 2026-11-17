---
title: "{{ replace .Name "-" " " | title }}"
publishDate: {{ .Date }}
date: {{ (now.AddDate 0 1 0).Format "2006-01-02T15:04:05-07:00" }}
endDate: {{ (now.AddDate 0 1 0).Format "2006-01-02T15:04:05-07:00" }}
---

** insert event details here **