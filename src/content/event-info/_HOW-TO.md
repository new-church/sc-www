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
3. Announce a cancellation: in Google Calendar, open just that one occurrence of the repeating event, change its title
   to include the word "Cancelled" (for example "CANCELLED: Swedenborg Tuesday open discussion"), save, and choose
   "This event" (not "All events"). The website then shows that one date in red as cancelled, with no file to touch.
   Deleting an event is different: a deleted event simply disappears from the website, as if it was never planned. Use
   that for tidying the calendar and for re-planning ahead, and use the rename only when people should be told.

Time zones: the website shows every time in the viewer's own time zone (named on the page), and lets them flip to
Sydney time, so you don't need to write times anywhere. Set the time in Google Calendar as normal, in the zone you are in.
A bracket at the end of a calendar title that holds a clock time, such as "(weekly, 11am-1pm)", is left off the website's
display title (it would be wrong for viewers in other zones); put times in the calendar entry itself, not the title.

Files and folders starting with an underscore (like this one) are ignored by the website.
