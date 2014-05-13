Project Description
-------------------

The XDI graph editor project is, as the name implies, a graphic editor for
visualizing and manipulating XDI graphs. XDI is an OASIS Technical committee
whose purpose is to define a format and protocol for semantic data interchange
using a standard addressable semantic graph model serialized in JSON (see [1]
for more details).


Project Setup
-------------
This project relies on the D3 javascript library ([2]). This library will be
automatically retrieved upon launch of the editor.

The tool also leverages an XDI javascript library (xdi.js). this library is
included in the tool archive (see [6] for more details).

Finally, the tool uses JQuery ([4]). This library will also be automatically
retrieved upon launch of the editor.


Deploying
---------
Once the file archive file has been downloaded and unziped, simply load the
index.html file in your browser.


Troubleshooting & Useful Tools
------------------------------
Both a manual and a tutorial are available within the tool: click on the Help
button on the top right corner of the browser window.

It is strongly recommended to go through the tutorial before attempting to
manipulate your own XDI graphs.


Contributors
------------
If you find a bug or would like to suggest improvements, please use the issue
tracker available on GitHub.


Acknowledgements
----------------
The graph editing functionality of this tool is largely based on the D3
directed graph editor (see [3]) although it has been greatly modified since then.


License
-------
This tool is made available under the MIT license (see [5] for details).


[1] https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=xdi
[2] http://d3js.org/d3.v3.min.js
[3] http://bl.ocks.org/rkirsling/5001347
[4] http://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js
[5] http://opensource.org/licenses/MIT
[6] https://github.com/projectdanube/xdi-js