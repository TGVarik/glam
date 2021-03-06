/**
 * @fileoverview base node class
 * 
 * @author Tony Parisi
 */

glam.Node = {};


glam.Node.init = function(docelt) {

	docelt.glam = {
	};
	
	docelt.glam.setAttributeHandlers = [];
	docelt.glam.onSetAttribute = function(attr, val) {
		var i, len = docelt.glam.setAttributeHandlers.length;
		for (i = 0; i < len; i++) {
			var handler = docelt.glam.setAttributeHandlers[i];
			if (handler) {
				handler(attr, val);
			}
		}
	}
}

glam.Node.getStyle = function(docelt) {
	
	var glamClassList = new glam.ClassList(docelt);
	docelt.glam.classList = glamClassList;
	
	var style = new glam.Style(docelt);
	
	if (docelt.id) {
		var styl = glam.getStyle("#" + docelt.id);
		style.addProperties(styl);
	}
	
	var klass = docelt.getAttribute('class');
	if (!klass)
		klass = docelt['class'];
	
	if (klass) {
		
		var klasses = klass.split(" ");
		for (klassname in klasses) {
			var kls = klasses[klassname];
			if (kls) {
				var styl = glam.getStyle("." + kls);
				style.addProperties(styl);
				
				glamClassList.add(kls);
			}
		}
	}
	
	var styl = docelt.getAttribute("style");
	if (styl) {
		style.addPropertiesFromString(styl);
	}
	
	docelt.glam.style = style;
	
	return style;
}
