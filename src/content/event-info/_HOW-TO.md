# How to add extra detail to an event

Events themselves come from the Google Calendar. This folder is for what the calendar can't hold:
pictures, a longer write-up, a Zoom link, downloads.

1. Make a folder here named after the event. Spaces and capitals are fine.
   The folder is matched against the calendar title, so `open discussion` matches
   "Swedenborg Tuesday open discussion (weekly, 11am-1pm)". The longest match wins.
2. Put an `index.md` in the folder, with any of these at the top:

       ---
       img: ./photo.jpg            # a picture saved in this folder (or images/x.jpg from src/assets/images)
       zoomlink: https://...       # shown as the Join Zoom button
       attachments:
         - title: Reading list
           url: https://static.swedenborg.com.au/pdf/reading-list.pdf
       match: ["extra phrase"]     # optional: more words to match in the calendar title
       ---

   Then write the extra detail below in plain text. Pictures saved in the folder can be added with
   `![A caption](./photo.jpg)`.
3. Cancel one occurrence of a repeating event in Google Calendar: either delete just that one
   ("This event" only), or rename it to start with CANCELLED. The website shows it in red as cancelled
   without touching any file here. Only upcoming occurrences are marked: a deleted occurrence that has already passed is simply left off.

Files and folders starting with an underscore (like this one) are ignored by the website.
