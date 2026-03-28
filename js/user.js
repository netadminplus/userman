var UM_PROF_STATE = {0:"Pending", 1:"Running", 2:"Active", 3:"Used"};
var UM_PROF_STARTS_AT = {0:"On Login", 1:"Immediately"};
var UM_PAY_STATE = {0:"Started", 1:"Pending", 2:"Approved", 3:"Rejected", 4:"Error", 5:"Timed Out", 6:"Cancelled", 7:"User Approved"};

function formatTime(str) {
    if (!str || str === "0") return "0";
    if (str.toLowerCase() === "unlimited") return "Unlimited";
    
    var totalDays = 0;
    var weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0;
    
    var weeksMatch = str.match(/(\d+)w/);
    var daysMatch = str.match(/(\d+)d/);
    var hoursMatch = str.match(/(\d+)h/);
    var minutesMatch = str.match(/(\d+)m/);
    var secondsMatch = str.match(/(\d+)s/);
    
    if (weeksMatch) weeks = parseInt(weeksMatch[1]);
    if (daysMatch) days = parseInt(daysMatch[1]);
    if (hoursMatch) hours = parseInt(hoursMatch[1]);
    if (minutesMatch) minutes = parseInt(minutesMatch[1]);
    if (secondsMatch) seconds = parseInt(secondsMatch[1]);
    
    totalDays = (weeks * 7) + days;
    
    var result = totalDays + "d";
    if (hours > 0 || minutes > 0 || seconds > 0) {
        result += " " + hours + "h " + minutes + "m " + seconds + "s";
    }
    
    return result.trim();
}

function formatUnits(str) {
    if (!str) return str;
    return str.replace(/GiB/gi, 'GB').replace(/MiB/gi, 'MB').replace(/KiB/gi, 'KB');
}

function parseTrafficToGB(str) {
    if (!str || str === "0") return 0;
    var match = str.match(/([\d.]+)\s*(GiB|MiB|KiB|GB|MB|KB)/i);
    if (!match) return parseFloat(str) || 0;
    var value = parseFloat(match[1]);
    var unit = match[2].toLowerCase();
    if (unit === 'gib' || unit === 'gb') return value;
    if (unit === 'mib' || unit === 'mb') return value / 1024;
    if (unit === 'kib' || unit === 'kb') return value / (1024 * 1024);
    return value;
}

function formatTraffic(gbValue) {
    if (!gbValue || gbValue === 0) return "0 GB";
    var rounded = Math.ceil(gbValue * 2) / 2;
    return rounded.toFixed(1) + " GB";
}

function updateMenuState() {
    var hash = getLocationHash().split(":")[0] || "status";
    document.querySelectorAll('.menu a').forEach(function(link) {
        link.classList.remove('active-menu');
        if (link.id === "menu-" + hash) link.classList.add('active-menu');
    });
}

function blockGUI() {
    var blocker = document.getElementById("global-blocker");
    if(blocker) blocker.classList.add("visible");
}

function unblockGUI() {
    var blocker = document.getElementById("global-blocker");
    if(blocker) blocker.classList.remove("visible");
}

function processFailedResp(obj) { if (obj.type === "LOGIN") location.reload(); else alert(obj.data.error); }
function getLocationHash () { return window.location.hash.substring(1); }

function hideAll() {
    ["status", "sessions", "payments", "profiles", "profile", "buyprofile", "redirecting"].forEach(function(id) {
        var el = document.getElementById(id); if(el) el.style.display = "none";
    });
    document.getElementById("status-data").innerHTML = "";
    document.getElementById("status-profiles").innerHTML = "";
}

function processNavigation() {
    blockGUI(); hideAll(); updateMenuState();
    var hashMap = getLocationHash().split(":");
    var page = hashMap[0];
    if (page === "sessions") { document.getElementById("sessions").style.display = "block"; loadSessions(); }
    else if (page === "payments") { document.getElementById("payments").style.display = "block"; loadPayments(); }
    else if (page === "profiles") { document.getElementById("profiles").style.display = "block"; loadProfiles(); }
    else if (page === "profile") { document.getElementById("profile").style.display = "block"; loadProfile(hashMap[1]); }
    else if (page === "buyprofile") { document.getElementById("buyprofile").style.display = "block"; loadPaymentTypes(); }
    else { document.getElementById("status").style.display = "block"; loadStatusData(); }
}

window.onload = processNavigation;
window.onhashchange = processNavigation;

function loadStatusData() {
    ajax.post('../api/getUser', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if (obj.success) {
                var tableRows = "";
                tableRows += "<tr><td>Username:</td><td>" + obj.data.username + "</td></tr>";
                tableRows += "<tr><td>Allowed Concurrent Users:</td><td>" + (obj.data.sharedUsers == 0 ? 'Unlimited' : obj.data.sharedUsers) + "</td></tr>";
                tableRows += "<tr><td>Active Connections:</td><td>" + obj.data.activeSess + "</td></tr>";
                var downloadGB = parseTrafficToGB(obj.data.download);
                var uploadGB = parseTrafficToGB(obj.data.upload);
                var totalTraffic = downloadGB + uploadGB;
                tableRows += "<tr><td>Total Traffic Used:</td><td>" + formatTraffic(totalTraffic) + "</td></tr>";
                document.getElementById("status-data").innerHTML = tableRows;
            }
        } catch (e) { console.error(e); }
        unblockGUI();
    });

    ajax.post('../api/getUserProfiles', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if(obj.success) {
                var tableRows = "<thead><tr><th>Name</th><th>Status</th><th>Time Remaining</th><th>Action</th></tr></thead><tbody>";
                var waitingRows = "", runningRows = "";
                obj.data.profiles.forEach(function(p) {
                    var nameLink = "<td><a class=\"link\" href=\"#profile:"+p.profileId+"\">" + p.name + "</a></td>";
                    if (p.state == 0 || p.state == 1) {
                        var row = "<tr>" + nameLink + "<td>" + UM_PROF_STATE[p.state] + "</td><td>" + formatTime(p.expAfter) + "</td>";
                        row += "<td><button class='loginbtn btn-logout' value=\"" + p.id + "\" onclick=\"onActivateClick(this)\">Activate</button></td></tr>";
                        if(p.state == 1) runningRows += row; else waitingRows += row;
                    } else { tableRows += "<tr>" + nameLink + "<td>" + UM_PROF_STATE[p.state] + "</td><td>" + formatTime(p.expAfter) + "</td><td></td></tr>"; }
                });
                document.getElementById("status-profiles").innerHTML = tableRows + runningRows + waitingRows + "</tbody>";
            }
        } catch (e) { console.error(e); }
    });
}

function loadProfiles() {
    ajax.post('../api/getProfiles', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if(obj.success) {
                var tableRows = "<thead><tr><th>Profile Name</th><th>Validity</th><th>Starts At</th></tr></thead><tbody>";
                obj.data.profiles.forEach(function(p) {
                    tableRows += "<tr><td><a class=\"link\" href=\"#profile:"+p.id+"\">" + p.name + "</a></td><td>" + formatTime(p.validity) + "</td><td>" + UM_PROF_STARTS_AT[p.startsAt] + "</td></tr>";
                });
                document.getElementById("profiles-profiles").innerHTML = tableRows + "</tbody>";
            }
        } catch (e) { alert("Unknown error."); }
        unblockGUI();
    });
}

function loadSessions() {
    ajax.post('../api/getUserSessions', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if(obj.success) {
                var tableRows = "<thead><tr><th>Start</th><th>End</th><th>Duration</th><th>Download</th><th>Upload</th><th>Status</th></tr></thead><tbody>";
                var sessions = obj.data.sessions;
                for (var i = sessions.length - 1; i >= 0; i--) {
                    tableRows += "<tr><td>" + sessions[i].startTime + "</td><td>" + sessions[i].endTime + "</td><td>" + formatTime(sessions[i].uptime) + "</td><td>" + formatUnits(sessions[i].downloaded) + "</td><td>" + formatUnits(sessions[i].uploaded) + "</td><td>" + (sessions[i].active ? 'Active' : 'Closed') + "</td></tr>";
                }
                document.getElementById("sessions-sessions").innerHTML = tableRows + "</tbody>";
            }
        } catch (e) { alert("Unknown error."); }
        unblockGUI();
    });
}

function loadPaymentTypes() {
    ajax.post('../api/getPayamentTypes', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if (obj.success) {
                var pTypes = obj.data.paymentTypes;
                var resultHtml = "";
                if (pTypes.length) {
                    resultHtml += "<form id=\"buy-form\">";
                    for (var i = 0; i < pTypes.length; i++) {
                        var checkStr = (i == 0) ? "checked=\"checked\"" : "";
                        if (pTypes[i].typeId === 1) resultHtml += "<label style='display:flex; align-items:center; gap:10px; margin-bottom:10px; cursor:pointer'><input type=\"radio\" name=\"paymethod\" value=\"1\" " + checkStr + " /> <img src=\"../img/PayPal_mark_37x23.gif\" /> PayPal</label>";
                        else if (pTypes[i].typeId === 2) resultHtml += "<label style='display:flex; align-items:center; gap:10px; margin-bottom:10px; cursor:pointer'><input type=\"radio\" name=\"paymethod\" value=\"2\" " + checkStr + " /> Credit Card (Authorize.net)</label>";
                    }
                    resultHtml += "</form><button class='loginbtn' style='width:auto; padding:10px 30px' onclick=\"onBuyClick(this);\">Buy and Pay</button>";
                } else { resultHtml += "<div style=\"text-align:center;padding:20px;\">No payment gateway is active.</div>"; }
                document.getElementById("buyprofile-buyprofile").innerHTML = resultHtml;
            }
        } catch (e) { alert("Unknown error."); }
        unblockGUI();
    });
}

function loadPayments() {
    ajax.post('../api/getUserPayments', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if(obj.success) {
                var tableRows = "<thead><tr><th>Type</th><th>Profile</th><th>Start</th><th>End</th><th>Message</th><th>Status</th><th>Action</th></tr></thead><tbody>";
                obj.data.payments.forEach(function(p) {
                    tableRows += "<tr><td>Paypal</td><td>" + p.profileName + "</td><td>" + p.start + "</td><td>" + p.end + "</td><td>" + p.message + "</td><td>" + UM_PAY_STATE[p.state] + "</td>";
                    if (p.state == 0 || p.state == 1 || p.state == 7) tableRows += "<td><button class='loginbtn btn-logout' value=\"" + p.id + "\" onclick=\"onContinueBuyClick(this)\">Continue Purchase</button></td>";
                    else tableRows += "<td></td>";
                    tableRows += "</tr>";
                });
                document.getElementById("payments-payments").innerHTML = tableRows + "</tbody>";
            }
        } catch (e) { alert("Unknown error."); }
        unblockGUI();
    });
}

function loadProfile(profileId) {
    ajax.post('../api/getProfile', {id: profileId}, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if (obj.success) {
                var d = obj.data;
                var tableRows = "<tr><td>Profile Name:</td><td>" + d.name + "</td></tr><tr><td>Price:</td><td>" + d.price + "</td></tr><tr><td>Validity:</td><td>" + formatTime(d.validity) + "</td></tr><tr><td>Starts At:</td><td>" + UM_PROF_STARTS_AT[d.startsAt] + "</td></tr>";
                if (d.canBuy) tableRows += "<tr><td colspan=\"2\"><button class='loginbtn btn-logout' onclick=\"window.location.href='#buyprofile:" + d.id + "'\">Buy This Profile</button></td></tr>";
                document.getElementById("profile-data").innerHTML = tableRows;
            }
        } catch (e) { alert("Unknown error."); }
        unblockGUI();
    });
}

function onActivateClick(elmnt) {
    blockGUI();
    ajax.post('../api/activateProfile', {'id' : elmnt.value}, function(responseText) {
        try { var obj = JSON.parse(responseText); if(obj.success) loadStatusData(); else processFailedResp(obj); } catch (e) { alert("Unknown error."); }
        unblockGUI();
    });
}

function onContinueBuyClick(elmnt) {
    blockGUI();
    ajax.post('../api/continueBuy', {'id' : elmnt.value}, function(responseText) {
        try { var obj = JSON.parse(responseText); if(obj.success) loadPayments(); else { processFailedResp(obj); loadPayments(); } } catch (e) { alert("Unknown error."); }
        unblockGUI();
    });
}

function onBuyClick(elmnt) {
    blockGUI();
    var buyForm = document.getElementById("buy-form");
    ajax.post('../api/buyProfile', { 'payMethod' : buyForm["paymethod"].value, 'profileId' : getLocationHash().split(":")[1] }, function(responseText) {
        try { var obj = JSON.parse(responseText); if(obj.success) { hideAll(); document.getElementById("redirecting").style.display = "block"; window.location.href = obj.data.redirectUrl; } else { unblockGUI(); processFailedResp(obj); } } catch (e) { unblockGUI(); alert("Unknown error."); }
    });
}

function onMenuClick(elmnt) {
    if (elmnt.id === "menu-status") location.hash = "#status";
    else if (elmnt.id === "menu-sessions") location.hash = "#sessions";
    else if (elmnt.id === "menu-payments") location.hash = "#payments";
    else if (elmnt.id === "menu-profiles") location.hash = "#profiles";
    else { ajax.post('../api/logout', null, function(responseText) { try { if (JSON.parse(responseText).success) location.reload(); } catch (e) { alert("Unknown error."); } }); }
}
