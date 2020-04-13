DIYEC Garage Scraper & Server
============================

What does it do?
----------------
It scrapes web.archive.org (with the help of their CDX query API), and does it's best to rebuild the garage section of DIYElectricCar. It's not perfect, and a lot of the images are missing, but it does what it can.

The page contents are formatted in a (hopefully sane) manner and stored in the DIYEC.sqlite database. If that database is missing, it will create it.

Images are retrieved in the best format available on the archive, thumbnails first, then full size images. They're then stored in the images directory (you may have to make that yourself).

The webserver fires up on port 8000 and serves an incredibly simple site that lists the vehicles (with pagination) and allows you to go into detail. There is no searching or sorting, but that should be pretty easy to set up.