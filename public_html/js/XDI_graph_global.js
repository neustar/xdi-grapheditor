/* 
The MIT License (MIT)

Copyright (c) 2014 Neustar Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


// Global D3/SVG vars
//SVG Dimensions
var totalWidth = 1800;
var totalHeight = 800;
var svgMargin = {top:0,left:0,right:0,bottom:0}
var svgWidth = totalWidth - svgMargin.left - svgMargin.right;
var svgHeight = totalHeight - svgMargin.top - svgMargin.bottom;


//SVG Components
var svg;

var force;
var x,y;
var zoom;
var drag=null;

var relData;
var node, link, labels;
var drag_line, drag;

var NODE_RADIUS = 13;
var NODE_TEXT_MAX_LENGTH = 20;
var LINK_TEXT_MAX_LENGTH = 20;

// mouse event vars
var MOUSE_WHEEL_SCALE_DELTA = 0.02;

var mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null,
    lastMousePos = null, //mouse pos when mouse down
    currMousePos = null; //mouse pos will dragging

var isPanning = false;
var isDraggingLine = false;



// suspending key listener when dialog box is displayed
var suspendkeylistening = false;

var lastKeyDown = -1;
var isFrozen = false;



//Model
var STORAGE_PREFIX = "XDI_GRAPH_EDITOR_";
var lastNodeId = 0,lastLinkId = 0;
var nodeslinkmap = {};
var jsonnodes, jsonlinks;
var lastDrawData = null;

//Zoom
var navScale = 0.2;
var navX,navY; //axis for navigator svg
var lastTransition = null;

//Search
var lastQuery = null;

//Select
var selected_nodes = null, // a collection of all the selected nodes
    selected_links = null;

//Drag Select
var dragSelectBrush = null;