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

function initializeDialogs () {
	//Define the dialog for Import XDI
    $('#import-dialog').dialog({
        autoOpen: false,
        height: 600,
        width: 600,
        modal: true,
        buttons: {
            "Graph it!": function() {
                var importedXDI = $('#XDIsource').val();
                var willClearGraph = $('#clearGraphCheckBox').prop('checked');
                var willJoinGraph = $('#joinGraphCheckBox').prop('checked');
                var willFoldRoot = $('#foldRootCheckBox').prop('checked');
                $(this).dialog('close');
                isDialogVisible = false;
                if(!_.isEmpty(importedXDI))
                    initializeGraphWithXDI(importedXDI,willClearGraph,willJoinGraph,willFoldRoot);
            },
            Cancel: function() {
                $(this).dialog('close');
                isDialogVisible = false; 
            }
        },
    });

    $( "#error-dialog" ).dialog({
      resizable: false,
      autoOpen: false,
      height:340,
      width:600,
      modal: true,
      buttons: {
        // "Go to XDI Converter": function() {
        //   $( this ).dialog( "close" );
        //   window.open('http://xdi2.projectdanube.org/XDIConverter', '_blank');
        //   isDialogVisible = false;
        // },
        Done: function() {
          $( this ).dialog( "close" );
          isDialogVisible = false;
        }
      }
    });

    $("#copy-dialog" ).dialog({
      autoOpen: false,
      resizable: false,
      height:340,
      width:600,
      modal: true,
      buttons: {
        "Done": function() {
          $( this ).dialog( "close" );
        }
      }
    });
}

function openImportDialog () {
	isDialogVisible = true;
    $('#import-dialog').dialog("open");
}

function openErrorDialog (content, linenum) {
	isDialogVisible = true;
  $('#error-dialog #error-line-num').text(linenum+1);
  $('#error-dialog #error-line-content').text(content);
  $('#error-dialog').dialog("open");	
}

function openCopyDialog () {
  var labels = [];
  d3.selectAll('.selected text')
    .each(function() { labels.push(this.textContent);});
  
  $('#labelTextArea').text(labels.join('\n'));
  
  $('#copy-dialog').dialog('open');
}

function initializeMenu(){
    var menu = $('.menu');
    var header = $('.menu-header');
    var item = $('.menu-item');

    header.click(function(e) { 
      e.stopPropagation();
      menu.toggleClass('active'); 
    })
    header.mouseenter(function() { header.removeClass('active'); $(this).addClass('active'); })

    item.click(function(e) { 
      e.stopPropagation();
      menu.removeClass('active'); 
      header.removeClass('active'); 
    });
    $('body').mousedown(function(e) { 
      if(menu.has(e.toElement).length==0)
      {
        menu.removeClass('active');
        header.removeClass('active');
      }
    })
}