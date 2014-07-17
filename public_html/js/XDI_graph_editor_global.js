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

//Browser
var BrowserTypes = {
    Chrome:'Chrome',
    Firefox:'Firefox',
    Safari:'Safari',
    Other:'Other'
}

var currentBrowser=null;

// Global D3/SVG vars

//SVG Dimensions
var svgMargin = {top:0,left:0,right:0,bottom:0}
var svgWidth = 0;
var svgHeight = 0;


//SVG Components
var svg = null;

var x = null,y = null;
var zoom = null;
var drag = null;

var relData = null;
// var node, link, labels;
var drag_line = null, drag = null;

var DEFAULT_NODE_RADIUS = 13;
var NODE_RADIUS = 13;
var NODE_TEXT_MAX_LENGTH = 20;
var LINK_TEXT_MAX_LENGTH = 20;

var globalLayoutSettings = {
    nodeScale: 1
}

var Mode = {
    BROWSE:'browse',
    EDIT:'edit',
    VIEW:'view',
    ZOOM_IN:'zoom in',
    ZOOM_OUT:'zoom out',
    PAN:'pan'
}
var currentMode = Mode.BROWSE;

// mouse event vars
var mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null,
    lastMousePos = null, //mouse pos when mouse down
    curMousePos = null; //mouse pos while dragging

var isPanning = false;
var isDraggingLine = false;
var isCreatingDragLine = false; //Mostly use for touchscreen. If true, user can drag from one node to another without pressing shift. 


// suspending key listener when dialog box is displayed
var isDialogVisible= false;

var lastKeyDown = -1;
var isFrozen = false;


//Model
var STORAGE_PREFIX = "XDI_GRAPH_EDITOR_";
var lastNodeId = 0,lastLinkId = 0;
var globalNodeLinkMap = {};
var globalNodes = null, globalLinks = null;
var lastDrawData = null;

var lastGraphId = -1;

var backupData = [null]; 
var currentBackupPos = 0;


//Zoom
var navScale = 0.1,navMargin = 20;
var lastTransition = null;
var zoomToFitMargin = 30;
var navDrag = null;
var isViewRectStatic = false; //whether #viewRect is static in the navigator
var MOUSE_WHEEL_SCALE_DELTA = 0.02;
var ZOOM_COMMAND_SCALE_DELTA = 0.1;

//Search
var lastQuery = null;

//Select
var selected_nodes = null, // a collection of all the selected nodes
    selected_links = null;

//Drag Select
var dragSelectBrush = null;

//Copy & Paste
var clipBoard = {nodes: [], links: []};
var NEW_ELEMENT_POS_DELTA = 100;

//Screenshot
var SCREENSHOT_MARGIN = 50;
var SCREENSHOT_CHARACTER_WIDTH = 10;

//Layout
var force = null;
var partition = null;
var Layouts = {
    Force: "force",
    Tree: "tree"
}
var currentLayout = null//ForceLayout;
var HALF_CIRCLE_RANGE = 0.1;
var LAYOUT_TRANSITION_DURATION = 500;