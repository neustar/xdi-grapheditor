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

function initializeLayout(nodes,links) {
	var numberOfNodes = nodes.length;
	var numberOflinks = links.length;

	nodes.forEach(function (item) {
		item.fixed = isFrozen     //if overall is frozen
        ||item.isRoot             //if a node is root
        ||item._fixed             //or is intenionally set to fixed from other ways
        || ((item.parents == null || item.parents.length == 0) &&(item.children == null || item.children.length == 0));

	})                             //or has no other links


	force
	.gravity(0)
	.linkDistance(function(d) { 
            return 40*d.source.children.length;
        })
    .linkStrength(function(d) { 
            return d.isRel?0.03:3;
        })
    .charge(function(d) { return d.isRoot?-100*numberOfNodes:-10*numberOfNodes; })
    .chargeDistance(1000)


    force
    .nodes(nodes)
    .links(links)
    .start()
}