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
