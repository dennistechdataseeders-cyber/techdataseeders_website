// ============================================================
// SERVER-SIDE BLOG RENDERER
// Mirrors client-side blog rendering from blog/post.html and blog/index.html
// ============================================================

const ICONS = {
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chart: '<path d="M3 21h18"/><path d="M7 21V10"/><path d="M12 21V4"/><path d="M17 21v-7"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2l-5-4.9 6.9-1z"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  bar: '<rect x="4" y="4" width="4" height="16"/><rect x="12" y="10" width="4" height="10"/>'
};

const GRADIENTS = {
  blue: 'linear-gradient(135deg,#0d1b4b 0%,#1a4fd6 50%,#2563FF 100%)',
  green: 'linear-gradient(135deg,#064e3b 0%,#059669 50%,#10b981 100%)',
  purple: 'linear-gradient(135deg,#2e1065 0%,#5b21b6 50%,#7c3aed 100%)',
  magenta: 'linear-gradient(135deg,#4d1a3d 0%,#9d4edd 50%,#c77dff 100%)',
  teal: 'linear-gradient(135deg,#1a4d3d 0%,#2d9d6e 50%,#52b788 100%)',
  navy: 'linear-gradient(135deg,#0d1840 0%,#162050 60%,#2563FF 100%)'
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(s) {
  var links = [];
  var out = String(s || '');
  
  out = out.replace(/<a\s+[^>]*>.*?<\/a>/gi, function(match) {
    links.push(match);
    return '###LINK' + (links.length - 1) + '###';
  });
  
  out = out
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[(.+?)\]\((\/[^\s)]+|https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  
  out = out.replace(/###LINK(\d+)###/g, function(match, index) {
    return links[parseInt(index)];
  });
  
  return out;
}

function getGradient(post) {
  return GRADIENTS[post.gradient] || GRADIENTS.blue;
}

function getIcon(post) {
  return ICONS[post.icon] || ICONS.database;
}

function getPostUrl(slug) {
  return '/blog/' + slug + '/';
}

function parseTableRow(rowLine) {
  var cells = rowLine.split('|');
  if (rowLine.indexOf('|') === 0) {
    cells.shift();
  }
  if (rowLine.lastIndexOf('|') === rowLine.length - 1 && rowLine.length > 1) {
    cells.pop();
  }
  return cells.map(function(c) { return c.trim(); });
}

function renderTable(tableLines) {
  if (tableLines[0] && tableLines[0].indexOf('Product A') === 0 && tableLines[0].split('|').length === 6) {
    tableLines.unshift('Product | Marketplace | Date | Seller | Price | Availability');
    tableLines.splice(1, 0, '---|---|---|---|---|---');
  }
  
  var dividerIndex = -1;
  for (var j = 0; j < tableLines.length; j++) {
    var cleanLine = tableLines[j].trim();
    if (/^[|:\-\s]+$/.test(cleanLine) && cleanLine.indexOf('-') !== -1) {
      dividerIndex = j;
      break;
    }
  }
  
  var html = '<div class="table-container"><table>';
  var headerRows = [];
  var bodyRows = [];
  
  if (dividerIndex !== -1) {
    headerRows = tableLines.slice(0, dividerIndex);
    bodyRows = tableLines.slice(dividerIndex + 1);
  } else {
    headerRows = [tableLines[0]];
    bodyRows = tableLines.slice(1);
  }
  
  if (headerRows.length > 0) {
    html += '<thead>';
    headerRows.forEach(function(rowLine) {
      html += '<tr>';
      var cells = parseTableRow(rowLine);
      cells.forEach(function(cell) {
        html += '<th>' + escapeHtml(cell) + '</th>';
      });
      html += '</tr>';
    });
    html += '</thead>';
  }
  
  if (bodyRows.length > 0) {
    html += '<tbody>';
    bodyRows.forEach(function(rowLine) {
      html += '<tr>';
      var cells = parseTableRow(rowLine);
      cells.forEach(function(cell) {
        html += '<td>' + escapeHtml(cell) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody>';
  }
  
  html += '</table></div>';
  return html;
}

function renderBody(md) {
  var lines = String(md || '').split(/\r?\n/);
  var html = '', listOpen = false;
  function closeList() { if (listOpen) { html += '</ul>'; listOpen = false; } }

  var faqs = [];
  var tempInFaq = false;
  var currentQuestion = null;
  var currentAnswer = [];

  for (var j = 0; j < lines.length; j++) {
    var l = lines[j].trim();
    if (l.indexOf('## ') === 0 && l.toLowerCase().indexOf('faq') !== -1) {
      tempInFaq = true;
      continue;
    }
    if (tempInFaq) {
      if (l.indexOf('## ') === 0 || l.indexOf('### ') === 0) {
        if (currentQuestion && currentAnswer.length > 0) {
          faqs.push({ q: currentQuestion, a: currentAnswer.join(' ') });
        }
        tempInFaq = false;
        continue;
      }
      if (l.indexOf('**') === 0 && l.lastIndexOf('**') === l.length - 2 && l.length > 4) {
        if (currentQuestion && currentAnswer.length > 0) {
          faqs.push({ q: currentQuestion, a: currentAnswer.join(' ') });
        }
        currentQuestion = l.slice(2, -2).trim();
        currentAnswer = [];
      } else if (l) {
        if (currentQuestion) {
          currentAnswer.push(l);
        }
      }
    }
  }
  if (currentQuestion && currentAnswer.length > 0) {
    faqs.push({ q: currentQuestion, a: currentAnswer.join(' ') });
  }

  var inFaqSection = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      closeList();
      continue;
    }
    
    if (line.indexOf('## ') === 0 && line.toLowerCase().indexOf('faq') !== -1) {
      closeList();
      inFaqSection = true;
      html += '<h2>' + inline(line.slice(3)) + '</h2>';
      html += '<div class="faq-accordion">';
      faqs.forEach(function(faq) {
        html += '<div class="faq-item">';
        html += '<button class="faq-question" onclick="toggleFaq(this)">';
        html += '<span>' + faq.q + '</span>';
        html += '<span class="faq-arrow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>';
        html += '</button>';
        html += '<div class="faq-answer">';
        html += '<p>' + faq.a + '</p>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
      continue;
    }
    
    if (inFaqSection) {
      if (line.indexOf('## ') === 0 || line.indexOf('### ') === 0) {
        inFaqSection = false;
      } else {
        continue;
      }
    }

    if (line.indexOf('|') !== -1) {
      closeList();
      var tableLines = [];
      while (i < lines.length && lines[i].trim().indexOf('|') !== -1) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--;
      html += renderTable(tableLines);
      continue;
    }

    // Check if this is an HTML link line
    if (line.indexOf('<a ') === 0) {
      closeList();
      html += '<p>' + line + '</p>';
      continue;
    }

    if (line.indexOf('## ') === 0) { 
      closeList(); 
      html += '<h2>' + inline(line.slice(3)) + '</h2>'; 
    }
    else if (line.indexOf('### ') === 0) { 
      closeList(); 
      html += '<h3>' + inline(line.slice(4)) + '</h3>'; 
    }
    else if (line.indexOf('> ') === 0) { 
      closeList(); 
      html += '<blockquote class="bd-quote"><p>' + inline(line.slice(2)) + '</p></blockquote>'; 
    }
    else if (line.indexOf('- ') === 0) { 
      if (!listOpen) { 
        html += '<ul>'; 
        listOpen = true; 
      } 
      html += '<li>' + inline(line.slice(2)) + '</li>'; 
    }
    else { 
      closeList(); 
      html += '<p>' + inline(line) + '</p>'; 
    }
  }
  closeList();
  return html;
}

module.exports = {
  ICONS,
  GRADIENTS,
  escapeHtml,
  inline,
  getGradient,
  getIcon,
  getPostUrl,
  parseTableRow,
  renderTable,
  renderBody
};
