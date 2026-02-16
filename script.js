const API_URL = 'https://script.google.com/macros/s/AKfycbwG462ao0VUGfTOuxNcnYm-BDuNorNLtjFS-b5FY6jo4vzkdFvNv_2CRipYBoYp5_hhvw/exec'; 

let currentUser = null;
let currentPass = null;
let tableInstance = null;

// On document load
$(document).ready(function() {
    // Ensure logout button is hidden initially
    toggleLogoutButton(false);
});

function toggleLogoutButton(show) {
    if (show) {
        $('#logout-section').fadeIn();
    } else {
        $('#logout-section').hide();
    }
}

function showView(viewId) {
    $('.auth-box, #inventory-section').hide();
    $('#' + viewId).fadeIn();
    $('.error, .success').hide().text('');
    $('input').val('');
}

function handleAuth(action) {
    let payload = { action: action };
    let msgBox, btn;

    if (action === 'login') {
        payload.username = $('#login-user').val();
        payload.password = $('#login-pass').val();
        msgBox = $('#login-msg'); btn = $('#btn-login');
    } else if (action === 'signup') {
        payload.username = $('#signup-user').val();
        payload.password = $('#signup-pass').val();
        msgBox = $('#signup-msg'); btn = $('#btn-signup');
    } else if (action === 'change_password') {
        payload.username = $('#cp-user').val();
        payload.old_password = $('#cp-old').val();
        payload.new_password = $('#cp-new').val();
        msgBox = $('#cp-msg'); btn = $('#btn-cp');
    }

    msgBox.hide(); 
    btn.prop('disabled', true).find('.btn-text').hide().end().find('.spinner').show();

    $.ajax({
        url: API_URL,
        method: "POST",
        data: JSON.stringify(payload),
        contentType: "text/plain", 
        success: function(response) {
            btn.prop('disabled', false).find('.btn-text').show().end().find('.spinner').hide();
            
            let res;
            try {
                if (typeof response === "object") {
                    res = response; 
                } else {
                    res = JSON.parse(response); 
                }
            } catch (e) {
                console.error("Raw response:", response);
                msgBox.addClass('error').text("Server returned invalid data.").show();
                return;
            }

            if (res.status === 'success') {
                if (action === 'login') {
                    currentUser = payload.username;
                    currentPass = payload.password;
                    $('.auth-box').hide();
                    $('#inventory-section').fadeIn();
                    toggleLogoutButton(true); // SHOW LOGOUT BUTTON
                    loadTable();
                } else if (action === 'signup') {
                    alert("Account created! Logging you in...");
                    currentUser = payload.username;
                    currentPass = payload.password;
                    $('.auth-box').hide();
                    $('#inventory-section').fadeIn();
                    toggleLogoutButton(true); // SHOW LOGOUT BUTTON
                    loadTable();
                } else if (action === 'change_password') {
                    alert("Password changed! Please login again."); 
                    logout();
                }
            } else {
                msgBox.addClass('error').text(res.message).show();
            }
        },
        error: function(xhr, status, error) {
            console.error("AJAX Error:", error);
            btn.prop('disabled', false).find('.btn-text').show().end().find('.spinner').hide();
            msgBox.addClass('error').text("Connection failed. Check internet.").show();
        }
    });
}

function loadTable() {
    if ($.fn.DataTable.isDataTable('#inventory')) {
        $('#inventory').DataTable().ajax.reload();
        return;
    } 

    tableInstance = $('#inventory').DataTable({
        processing: true,
        pageLength: 5,
        lengthChange: false, // Simplify UI for minimal look
        ajax: function (data, callback, settings) {
            $.ajax({
                url: API_URL,
                method: 'POST',
                contentType: "text/plain", 
                data: JSON.stringify({
                    action: "get_inventory",
                    username: currentUser,
                    password: currentPass
                }),
                success: function (response) {
                    let json;
                    if (typeof response === "object") {
                        json = response;
                    } else {
                        try {
                            json = JSON.parse(response);
                        } catch(e) {
                            json = { data: [] };
                        }
                    }
                    
                    if (json.error) {
                        alert(json.error);
                        logout();
                    } else {
                        callback({ data: json.data || [] });
                    }
                },
                error: function() {
                    alert("Failed to load inventory.");
                    callback({ data: [] });
                }
            });
        },
        columns: [
            { 
                data: 'item_name', 
                defaultContent: "-",
                render: function (data) {
                    if (!data || data === "-") return "-";
                    let text = String(data); 
                    return text.charAt(0).toUpperCase() + text.slice(1);
                }
            },
            { 
                data: 'qty', 
                defaultContent: "0",
                render: function (data) {
                    if (!data || data === "0") return "0";
                    let text = String(data); 
                    return text.charAt(0).toUpperCase() + text.slice(1);
                }
            },
            {   data: 'unit', 
                defaultContent: "-",
                render: function (data) {
                    if (!data || data === "-") return "-";
                    let text = String(data);
                    return text.charAt(0).toUpperCase() + text.slice(1);
                }
             },
            { 
                data: 'category', 
                defaultContent: "-",
                render: function (data) {
                    if (!data || data === "-") return "-";
                    let text = String(data);
                    return text.charAt(0).toUpperCase() + text.slice(1);
                }
            },
            { 
                data: 'expiry', 
                defaultContent: "-",
                render: function (data) {
                    if (!data || data === "N/A" || data === "-") return "N/A";
                    return moment(data).format('YYYY-MM-DD');
                }
            },
            { data: 'status', defaultContent: "N/A" },
            { data: 'days_left', defaultContent: "N/A" } 
        ]
    });
}

function prepareChangePass() {
    if(currentUser) $('#cp-user').val(currentUser);
    showView('change-pass-view');
}

function logout() {
    currentUser = null; 
    currentPass = null;
    toggleLogoutButton(false); // HIDE LOGOUT BUTTON
    location.reload(); 
}