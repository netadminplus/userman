var UM_PROF_STATE = {0:"در انتظار", 1:"در حال اجرا", 2:"فعال", 3:"استفاده شده"};
var UM_PROF_STARTS_AT = {0:"زمان ورود", 1:"بلافاصله"};
var UM_PAY_STATE = {0:"شروع شده", 1:"در انتظار", 2:"تایید شده", 3:"رد شده", 4:"خطا", 5:"زمان پایان یافته", 6:"لغو شده", 7:"تایید کاربر"};

function faTime(str) {
    if (!str || str === "0") return "0";
    if (str.toLowerCase() === "unlimited") return "نامحدود";
    return str
        .replace(/(\d+)d/g, '$1 روز و ')
        .replace(/(\d+)h/g, '$1 ساعت و ')
        .replace(/(\d+)m/g, '$1 دقیقه و ')
        .replace(/(\d+)s/g, '$1 ثانیه و ')
        .replace(/ و $/g, '')
        .trim();
}

function faUnits(str) {
    if (!str) return str;
    return str.replace(/GiB/gi, 'گیگابایت').replace(/MiB/gi, 'مگابایت').replace(/KiB/gi, 'کیلوبایت').replace(/B/gi, 'بایت');
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
    document.getElementById("status-exp-profiles").innerHTML = "";
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
                tableRows += "<tr><td>نام کاربری:</td><td>" + obj.data.username + "</td></tr>";
                tableRows += "<tr><td>تعداد کاربران همزمان مجاز:</td><td>" + (obj.data.sharedUsers == 0 ? 'نامحدود' : obj.data.sharedUsers) + "</td></tr>";
                tableRows += "<tr><td>اتصال‌های فعال فعلی:</td><td>" + obj.data.activeSess + "</td></tr>";
                tableRows += "<tr><td>کل دانلود:</td><td>" + faUnits(obj.data.download) + "</td></tr>";
                tableRows += "<tr><td>کل آپلود:</td><td>" + faUnits(obj.data.upload) + "</td></tr>";
                tableRows += "<tr><td>کل زمان اتصال:</td><td>" + faTime(obj.data.uptime) + "</td></tr>";
                document.getElementById("status-data").innerHTML = tableRows;
            }
        } catch (e) { console.error(e); }
        unblockGUI();
    });

    ajax.post('../api/getUserProfiles', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if(obj.success) {
                var tableRows = "<thead><tr><th>نام</th><th>وضعیت</th><th>زمان باقی‌مانده</th><th>عملیات</th></tr></thead><tbody>";
                var expTableRows = "<thead><tr><th>نام</th><th>وضعیت</th><th>تاریخ انقضا</th></tr></thead><tbody>";
                var waitingRows = "", runningRows = "";
                obj.data.profiles.forEach(function(p) {
                    var nameLink = "<td><a class=\"link\" href=\"#profile:"+p.profileId+"\">" + p.name + "</a></td>";
                    if (p.state == 3) { expTableRows += "<tr>" + nameLink + "<td>" + UM_PROF_STATE[p.state] + "</td><td>" + p.expAt + "</td></tr>"; }
                    else if (p.state == 0 || p.state == 1) {
                        var row = "<tr>" + nameLink + "<td>" + UM_PROF_STATE[p.state] + "</td><td>" + faTime(p.expAfter) + "</td>";
                        row += "<td><button class='loginbtn btn-logout' value=\"" + p.id + "\" onclick=\"onActivateClick(this)\">فعال‌سازی</button></td></tr>";
                        if(p.state == 1) runningRows += row; else waitingRows += row;
                    } else { tableRows += "<tr>" + nameLink + "<td>" + UM_PROF_STATE[p.state] + "</td><td>" + faTime(p.expAfter) + "</td><td></td></tr>"; }
                });
                document.getElementById("status-profiles").innerHTML = tableRows + runningRows + waitingRows + "</tbody>";
                document.getElementById("status-exp-profiles").innerHTML = expTableRows + "</tbody>";
            }
        } catch (e) { console.error(e); }
    });
}

function loadProfiles() {
    ajax.post('../api/getProfiles', null, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if(obj.success) {
                var tableRows = "<thead><tr><th>نام پروفایل</th><th>اعتبار</th><th>شروع از</th></tr></thead><tbody>";
                obj.data.profiles.forEach(function(p) {
                    tableRows += "<tr><td><a class=\"link\" href=\"#profile:"+p.id+"\">" + p.name + "</a></td><td>" + faTime(p.validity) + "</td><td>" + UM_PROF_STARTS_AT[p.startsAt] + "</td></tr>";
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
                var tableRows = "<thead><tr><th>شروع</th><th>پایان</th><th>مدت اتصال</th><th>دانلود</th><th>آپلود</th><th>وضعیت</th></tr></thead><tbody>";
                var sessions = obj.data.sessions;
                for (var i = sessions.length - 1; i >= 0; i--) {
                    tableRows += "<tr><td>" + sessions[i].startTime + "</td><td>" + sessions[i].endTime + "</td><td>" + faTime(sessions[i].uptime) + "</td><td>" + faUnits(sessions[i].downloaded) + "</td><td>" + faUnits(sessions[i].uploaded) + "</td><td>" + (sessions[i].active ? 'فعال' : 'بسته شده') + "</td></tr>";
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
                        else if (pTypes[i].typeId === 2) resultHtml += "<label style='display:flex; align-items:center; gap:10px; margin-bottom:10px; cursor:pointer'><input type=\"radio\" name=\"paymethod\" value=\"2\" " + checkStr + " /> کارت اعتباری (Authorize.net)</label>";
                    }
                    resultHtml += "</form><button class='loginbtn' style='width:auto; padding:10px 30px' onclick=\"onBuyClick(this);\">خرید و پرداخت</button>";
                } else { resultHtml += "<div style=\"text-align:center;padding:20px;\">هیچ درگاه پرداختی فعال نیست.</div>"; }
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
                var tableRows = "<thead><tr><th>نوع</th><th>پروفایل</th><th>شروع</th><th>پایان</th><th>پیام</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>";
                obj.data.payments.forEach(function(p) {
                    tableRows += "<tr><td>Paypal</td><td>" + p.profileName + "</td><td>" + p.start + "</td><td>" + p.end + "</td><td>" + p.message + "</td><td>" + UM_PAY_STATE[p.state] + "</td>";
                    if (p.state == 0 || p.state == 1 || p.state == 7) tableRows += "<td><button class='loginbtn btn-logout' value=\"" + p.id + "\" onclick=\"onContinueBuyClick(this)\">ادامه خرید</button></td>";
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
                var tableRows = "<tr><td>نام پروفایل:</td><td>" + d.name + "</td></tr><tr><td>قیمت:</td><td>" + d.price + "</td></tr><tr><td>مدت اعتبار:</td><td>" + faTime(d.validity) + "</td></tr><tr><td>شروع از:</td><td>" + UM_PROF_STARTS_AT[d.startsAt] + "</td></tr>";
                if (d.canBuy) tableRows += "<tr><td colspan=\"2\"><button class='loginbtn btn-logout' onclick=\"window.location.href='#buyprofile:" + d.id + "'\">خرید این پروفایل</button></td></tr>";
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