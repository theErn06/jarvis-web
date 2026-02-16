const API_URL = 'https://script.google.com/macros/s/AKfycbwG462ao0VUGfTOuxNcnYm-BDuNorNLtjFS-b5FY6jo4vzkdFvNv_2CRipYBoYp5_hhvw/exec'; 

let currentUser = null;
let currentPass = null;

$(document).ready(function() {
    toggleLogoutButton(false);

    // Mobile Search Binding
    $('#mobile-search-input').on('keyup', function() {
        if ($.fn.DataTable.isDataTable('#inventory')) {
            $('#inventory').DataTable().search(this.value).draw();
        }
    });

    // Mobile Sort Binding
    $('#mobile-sort-select').on('change', function() {
        if ($.fn.DataTable.isDataTable('#inventory')) {
            let val = $(this).val();
            let [col, dir] = val.split('_');
            $('#inventory').DataTable().order([parseInt(col), dir]).draw();
        }
    });
});

function toggleMenu() {
    $('#sidebar').toggleClass('open');
    $('.overlay').toggleClass('active');
}

function toggleLogoutButton(show) {
    if (show) $('#logout-section').show();
    else $('#logout-section').hide();
}

function showView(viewId) {
    $('#sidebar').removeClass('open');
    $('.overlay').removeClass('active');
    $('.card, .inventory-wrapper').hide();
    $('#' + viewId).fadeIn();
    $('.message').text('').removeClass('error');
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

    msgBox.removeClass('error').text('');
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
                res = (typeof response === "object") ? response : JSON.parse(response);
            } catch (e) {
                msgBox.addClass('error').text("Invalid server response.");
                return;
            }

            if (res.status === 'success') {
                if (action === 'login' || action === 'signup') {
                    currentUser = payload.username;
                    currentPass = payload.password;
                    $('.card').hide();
                    $('#inventory-section').fadeIn();
                    toggleLogoutButton(true);
                    loadTable();
                } else if (action === 'change_password') {
                    alert("Password updated. Please login again."); 
                    logout();
                }
            } else {
                msgBox.addClass('error').text(res.message);
            }
        },
        error: function() {
            btn.prop('disabled', false).find('.btn-text').show().end().find('.spinner').hide();
            msgBox.addClass('error').text("Connection failed. Please check internet.");
        }
    });
}

function loadTable() {
    if ($.fn.DataTable.isDataTable('#inventory')) {
        $('#inventory').DataTable().ajax.reload();
        return;
    } 

    $('#inventory').DataTable({
        processing: true,
        pageLength: 10,
        lengthChange: false, 
        language: { search: "", searchPlaceholder: "Search items..." },
        
        createdRow: function (row, data, dataIndex) {
            const labels = ['Item', 'Qty', 'Unit', 'Category', 'Expiry', 'Status', 'Days Left'];
            $('td', row).each(function(i) {
                $(this).attr('data-label', labels[i]);
            });
        },
        
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
                    try {
                        json = (typeof response === "object") ? response : JSON.parse(response);
                    } catch(e) {
                        json = { data: [] };
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
                    return `<strong>${text.charAt(0).toUpperCase() + text.slice(1)}</strong>`;
                }
            },
            { data: 'qty', defaultContent: "0" },
            { data: 'unit', defaultContent: "-" },
            { data: 'category', defaultContent: "-" },
            { 
                data: 'expiry', 
                defaultContent: "-",
                render: function (data) {
                    if (!data || data === "N/A" || data === "-") return "N/A";
                    return moment(data).format('YYYY-MM-DD');
                }
            },
            { 
                data: 'status', 
                defaultContent: "N/A",
                render: function(data) {
                    let color = '#333';
                    if(data === 'Expired') color = '#e74c3c';
                    else if(data === 'Good') color = '#27ae60';
                    else if(data === 'Expiring Soon') color = '#f39c12';
                    return `<span style="color:${color}; font-weight:600;">${data}</span>`;
                }
            },
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
    toggleLogoutButton(false);
    location.reload(); 
}
