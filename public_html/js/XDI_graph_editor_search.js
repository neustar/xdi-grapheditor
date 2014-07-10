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

//Atomic operation for search by string in a set

function searchElement (targetString,elementSet) {
	var res;
	res = elementSet.filter(function (d) {
			return d.shortName.indexOf(targetString) > -1;
		}
	)
	return res;
}

//Search both nodes and links from a last draw data
function searchAllByString (targetString) {
	var resData = {};
	resData.nodes = searchElement(targetString,lastDrawData.nodes);
	resData.links = searchElement(targetString,lastDrawData.links);
	return resData;
}

function searchOperation (targetString) {
	updateSearchResult(searchAllByString(targetString));
}

function clearSearchList () {
	d3.select("#searchResult")
		.selectAll("*").remove();
	
	d3.selectAll(".node")
		.classed("matched", false);

	d3.selectAll(".link")
		.classed("matched",false);
}

function updateSearchResult (resultData) {
	var list = d3.select("#searchResult");

	clearSearchList();

	d3.selectAll(".node")
		.data(resultData.nodes, function(d) {return d.id;})
		.classed("matched",true);

	d3.selectAll(".link")
		.data(resultData.links, function(d) {return d.id;})
		.classed("matched",true);	

	updateSublist(list,"Nodes",resultData.nodes);
	updateSublist(list,"Links",resultData.links);
}

function updateSublist (outerlist,title,data) {
	var header = outerlist.append("section")
	.attr('class', "searchHeader");
	
	header.append('p')
		.attr('class', 'title')
		.text(title);

	header.append('p')
		.attr('class', 'itemcount')
		.text(data.length + " matches");

	var list = outerlist.append("ul")
		.attr('class', "searchSubList")
	
	list.selectAll(".searchItem")
		.data(data)
		.enter()
		.append("li")
		.attr('class', 'searchItem')
		.on('click',function(d) { return zoomToElement(d); })
		.text(function(d) { return d.shortName;})
		.classed('relation', function(d) {return d.isRelation;})
	    .classed('literal', function(d) {
	    	return d.type === xdi.constants.nodetypes.LITERAL||(d.target != null && d.target.type === xdi.constants.nodetypes.LITERAL);
	    });
}



function searchTextChanged () {
	searchStart();

	var query = d3.select("#searchText").node().value;
	if (query == lastQuery || query == null)
		return;

	if(query.length == 0)
	{
		clearSearchList();
		lastQuery = null;
		return;
	}

	lastQuery = query;

	searchOperation(query);
}

function searchDone () {
	d3.select(".searchContainer")	
		.classed("folded", true);

	d3.select('#searchText').node().value = "";
	lastQuery = null;
	clearSearchList();
}

function searchStart () {
	d3.select(".searchContainer")	
		.classed("folded", false);

	// clearAllSelection();
}

















