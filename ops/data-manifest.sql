BEGIN READ ONLY;
SELECT kind,count(*) FROM app.published_content GROUP BY kind ORDER BY kind;
SELECT kind,count(*) FROM app.published_media GROUP BY kind ORDER BY kind;
ROLLBACK;
