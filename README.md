Search the Liber usualis
========================

This project contains all of the code used to set up an online version of
the [Liber usualis](http://ddmal.music.mcgill.ca/liber/)

It is made up of the following subprojects:

* solr

    > A solr configuration to set up and run a search server. Run ```mvn package```
to build a war file that can be deployed in tomcat or another servlet container.

* ingest

    > Python scripts to ingest the MEI files that make up the Liber usualis into solr.

* ocr

    > A set of tools to perform optical character recognition on the text of the liber.

* search

    > A webapp that lets you browse and search the Liber usualis. This custom app utilises the [diva.js](https://github.com/DDMAL/diva.js) document viewer.



For more information about the Liber usualis project, see our [project page](http://ddmal.music.mcgill.ca/research/omr/Search_the_Liber_Usualis).

## Symlinks
If necessary, OCR may need to be reran; keeping images locally may be prohibitive and you might
end up using symlinks. Here is the CLI command to create symlinks within the directory you are running
the command from.
```
ln -s /path/to/the/images/*.tiff .
```

To only selectively add symlinks, such as for a small test, you can do something like the following:
```
ln -s /path/to/your/photos/liber_0001*.jpg .
ln -s /path/to/your/photos/liber_0002*.jpg .
ln -s /path/to/your/photos/liber_0003*.jpg .
```

To remove later, use
```
find . -maxdepth 1 -type l -name "*.tiff" -delete
```
