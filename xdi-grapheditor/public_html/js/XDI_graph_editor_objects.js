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


function XDIElement () {
    this.id = -1;
    this.isAdded = false;
    this.isSelected = false;
}

function XDINode (id, fullName, shortName, type, graphId) {
    this.id = id;
    this.fullName = fullName;
    this.shortName = shortName;
    this.type = type;
    // this.isRoot = false;
    this.parents = [];
    this.children = [];
    this.graphId = graphId;

    this.isRoot = function(){return this.type === xdi.constants.nodetypes.ROOT;};
    this.isCommonRoot = function() { return this.fullName.length === 0; };
    this.isLiteral = function(){return this.type === xdi.constants.nodetypes.LITERAL;};
    this.isValue = function(){return this.type === xdi.constants.nodetypes.VALUE;};
    this.clone = function(){
        return new XDINode(this.id,this.fullName,this.type,this.graphId);
    }
}
XDINode.prototype = new XDIElement();


function XDILink (id,shortName, left, right, source, target)
{
    this.id = id;
    this.shortName = shortName;
    this.left = left;
    this.right = right;
    this.source = source;
    this.target = target;
    this.isRelation = false;
    this.clone = function() { 
        return new XDILink(this.id, this.shortName, this.left, this.right, this.source, this.target); 
    }
    this.isLiteral = function(){return this.target && this.target.type === xdi.constants.nodetypes.LITERAL;};
}
XDILink.prototype = new XDIElement();















