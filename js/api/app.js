/** Globális változó deklarálása */
var db = initIdb();

/** IDB kezelése Dexie */

// Dexie inicializálása
function initIdb() {
    var db = new Dexie('excelDB');
    db.version(1).stores({
    data: '++id, oktazon, gynev,'+
            ' anynev, szdatum, szhely,'+
            ' taj, cim,'+
            ' tcim,'+
            ' jvkezd, jvbef, apnev, aptsz, anytsz, jel'
    }); 
    return db;
}

// Adatok betöltése változóba
function retrieveData() {
    return db.data.toArray().then(function (result) {
        return result;
    });
}

/** read xlsx */

function xlsxToJSON(fileinputId, key) {
    var file = $('#'+fileinputId).prop('files')[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var sheetName = workbook.SheetNames[0];
        var sheet = workbook.Sheets[sheetName];
        var jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        switch (key) {
            case "view":
                saveToIndexedDB(mappedViewXlsx(jsonData));
                break;
        
            case "open":
                saveToIndexedDB(mappedOpenXlsx(jsonData));
                break;
        }

      };

      reader.readAsArrayBuffer(file);
};

function mappedOpenXlsx(jsonData) {
    return jsonData.slice(1).map(function (row) {
        return {
            oktazon: row[XLSX.utils.decode_col('C')],
            gynev: row[XLSX.utils.decode_col('A')],
            anynev: row[XLSX.utils.decode_col('G')],
            szdatum: row[XLSX.utils.decode_col('E')],
            szhely: row[XLSX.utils.decode_col('L')],
            taj: row[XLSX.utils.decode_col('P')],
            cim: row[XLSX.utils.decode_col('I')],
            tcim: row[XLSX.utils.decode_col('J')],
            jvkezd: row[XLSX.utils.decode_col('AL')],
            jvbef: row[XLSX.utils.decode_col('AM')],
            apnev: row[XLSX.utils.decode_col('H')],
            aptsz: '',
            anytsz: '',
            jel: row[XLSX.utils.decode_col('W')]
        };
    });
}

function mappedViewXlsx(jsonData) {
    return jsonData.slice(1).map(function (row) {
        return {
            oktazon: row[XLSX.utils.decode_col('A')],
            gynev: row[XLSX.utils.decode_col('B')],
            anynev: row[XLSX.utils.decode_col('C')],
            szdatum: row[XLSX.utils.decode_col('D')],
            szhely: row[XLSX.utils.decode_col('E')],
            taj: row[XLSX.utils.decode_col('F')],
            cim: row[XLSX.utils.decode_col('G')],
            tcim: row[XLSX.utils.decode_col('H')],
            jvkezd: row[XLSX.utils.decode_col('I')],
            jvbef: row[XLSX.utils.decode_col('J')],
            apnev: row[XLSX.utils.decode_col('K')],
            aptsz: row[XLSX.utils.decode_col('L')],
            anytsz: row[XLSX.utils.decode_col('M')],
            jel: row[XLSX.utils.decode_col('N')],
        };
    });
}

function saveToIndexedDB(data) {
    db.data.clear().then(function() {
    db.data.bulkAdd(data).then(function() {
        retrieveData().then(function (AllDataObj) {  
            selectData(AllDataObj);
            getOneData(AllDataObj, localStorage.getItem("selected"));
            nevsor(AllDataObj);
        });
    }).catch(function(error) {
        console.error('Error adding data to IndexedDB: ' + error);
    });
    }).catch(function(error) {
        console.error('Error opening IndexedDB: ' + error);
    });
}

/** Get data */

// undefined kezelése

function validDef(r){
  return (r == undefined) ? "" : r;
}

// personal data
function getOneData(AllDataObj, s){

    if (AllDataObj.length != 0) {

        var id = validDef(AllDataObj[s].id);
        $("#id").val(id);

        var fullname = validDef(AllDataObj[s].gynev);
        $("#fullname").html(fullname + " (" + (Number(s)+1) + ")");

        var jvkezd = validDef(AllDataObj[s].jvkezd);
        $("#jogvk").html(jvkezd);

        var jvbef = validDef(AllDataObj[s].jvbef);
        $("#jogvb").html(jvbef);

        var oktazon = validDef(AllDataObj[s].oktazon);
        $("#oktazon").html(oktazon);

        var anyjaneve = validDef(AllDataObj[s].anynev);
        $("#anyjaneve").html(anyjaneve);

        var anytsz = validDef(AllDataObj[s].anytsz);
        $("#anytsz").val(anytsz);

        var apjaneve = validDef(AllDataObj[s].apnev);
        $("#apjaneve").val(apjaneve);

        var aptsz = validDef(AllDataObj[s].aptsz);
        $("#aptsz").val(aptsz);

        var jel = validDef(AllDataObj[s].jel);
        $("#jel").val(jel);

        var szdatum = validDef(AllDataObj[s].szdatum);
        $("#szul").html(szdatum);

        var szhely = validDef(AllDataObj[s].szhely);
        $("#szulh").html(szhely);

        var taj = validDef(AllDataObj[s].taj);
        $("#taj").html(taj);

        var acim = `${AllDataObj[s].cim}`;
        var acm = ( AllDataObj[s].cim == undefined )?"":acim;
        $("#acim").html(acm);

        var tcim = `${AllDataObj[s].tcim}`;
        var tcm = ( AllDataObj[s].tcim == undefined || AllDataObj[s].tisz == "")?"":tcim;
        $("#tcim").html(tcm);
        
    }
}

// infó, legördülő lista, névsor tartalma
function selectData(AllDataObj){

    if (AllDataObj.length != 0){

        var listLength = AllDataObj.length;
        $("#length").html(listLength);
        
        var fullname = AllDataObj.map(function (row) {
            return [row.gynev]
        });

        var optionHtml = ";"
        for (let x in fullname) {
          optionHtml += "<option value=" + (x) + ">" + fullname[x] + "</option>";
        }
        $("#fullnamelist").html(optionHtml);

    }else{
        var uzenet = new sendMessage("#alert", "Töltsd fel az Excel fájt!", true, null, 5000);
        uzenet.send();
    }
}

var nevsorTable;

function nevsor(AllDataObj){
    var i = 1;
    var dataSet = AllDataObj.map(function (obj) {
        return [i++, obj.gynev, obj.jel, obj.szdatum];
    });

    if (nevsorTable) {
        nevsorTable.destroy();
    }
    
    nevsorTable = $('#nevsor').DataTable({
        destroy: true,
        lengthMenu: [{ label: 'All', value: -1 }],
        dom: 'ftr',
        columns: [
            { title: 'Sorsz' },
            { title: 'Név' },
            { title: 'Jel' },
            { title: 'Születésnap' }
        ],
        data: dataSet,
        language: hu,
        scrollX: true,
        retrieve: true
    });
}

/** az oldal betöltése után */

$(function(){

    $("#alert").click(function(){
      $("#alert").hide('slow');
    });
 
    $("#success").click(function(){
      $("#success").hide('slow');
    });

    retrieveData().then(function (AllDataObj) { 
      selectData(AllDataObj);
      getOneData(AllDataObj, 0);
      localStorage.setItem("selected", 0);
      nevsor(AllDataObj);
    });

    $('#fileinput').change(function () {

        var myFile = $('#fileinput').prop('files')[0];
        var fileName = (myFile)? myFile.name:false;

        if (fileName) { 
            $("#fname").html(fileName);
        }else{
            $("#fname").html("Nincs xlsx kiválasztva!");
        }

        xlsxToJSON("fileinput", "open");

        var text = `${fileName} feldolgozva!`;
        var err = "Válassz egy fájlt!";
        var uzenet = new sendMessage("#success", text, fileName, err, 5000);
        uzenet.send();

    });

    // egyéni adatok tartalma
    $("#fullnamelist").change(function(){

        var s = ($("#fullnamelist").val())?$("#fullnamelist").val():0;
        localStorage.setItem("selected",s);
        retrieveData().then(function (AllDataObj) { 
        
            getOneData(AllDataObj, s);

        });

    });

    // new DataTable('#datalist');

    $('#datalist').DataTable({
        lengthMenu: [{ label: 'All', value: -1 }],
        dom: 'tr',
        columnDefs: [
            {
                orderable: false,
                targets: [1]
            }
        ],
        language: hu,
        scrollX: true
    });

    // új adatok
    $("#apjaneve").change(function(){
        var apnev = $("#apjaneve").val();
        var id = Number($("#id").val());
        var s = $("#fullnamelist").val();
        var fullname = $("#fullname").text().slice(0,-4);
        db.data.update(id, {apnev: apnev}).then(function (updated) {
            var uzenet = new sendMessage("#success",
                "Az adatokat mentettük! Apja neve ("+fullname+"): "+apnev,
                updated, 
                "Semmi sem frissült - nem voltak adatok "+id+" elsődleges kulccsal!", 
                5000
            );
            uzenet.send();
            retrieveData().then(function (AllDataObj) { 
                $("#apjaneve").val(AllDataObj[s].apnev);
            });
        });
    });

    $("#aptsz").change(function(){
        var aptsz = $("#aptsz").val();
        var id = Number($("#id").val());
        var s = $("#fullnamelist").val();
        var fullname = $("#fullname").text().slice(0,-4);
        db.data.update(id, {aptsz: aptsz}).then(function (updated) {
            var uzenet = new sendMessage("#success",
                "Az adatokat mentettük! Apja telefonszáma ("+fullname+"): "+aptsz,
                updated, 
                "Semmi sem frissült - nem voltak adatok "+id+" elsődleges kulccsal!", 
                5000
            );
            uzenet.send();
            retrieveData().then(function (AllDataObj) { 
                $("#aptsz").val(AllDataObj[s].aptsz);
            });
        });
    });

    $("#anytsz").change(function(){
        var anytsz = $("#anytsz").val();
        var id = Number($("#id").val());
        var s = $("#fullnamelist").val();
        var fullname = $("#fullname").text().slice(0,-4);
        db.data.update(id, {anytsz: anytsz}).then(function (updated) {
            var uzenet = new sendMessage("#success",
                "Az adatokat mentettük! Anyja telefonszáma ("+fullname+"): "+anytsz,
                updated, 
                "Semmi sem frissült - nem voltak adatok "+id+" elsődleges kulccsal!", 
                5000
            );
            uzenet.send();
            retrieveData().then(function (AllDataObj) { 
                $("#anytsz").val(AllDataObj[s].anytsz);
            });
        });
    });

    $("#jel").change(function(){
        var jel = $("#jel").val();
        var id = Number($("#id").val());
        var s = $("#fullnamelist").val();
        var fullname = $("#fullname").text().slice(0,-4);
        db.data.update(id, {jel: jel}).then(function (updated) {
            var uzenet = new sendMessage("#success",
                "Az adatokat mentettük! Jele ("+fullname+"): "+jel,
                updated, 
                "Semmi sem frissült - nem voltak adatok "+id+" elsődleges kulccsal!", 
                5000
            );
            uzenet.send();
            retrieveData().then(function (AllDataObj) { 
                $("#jel").val(AllDataObj[s].jel);
                nevsor(AllDataObj);
            });
        });
    });

    // Betöltés a kiegészített adatokkal
    $('#fileInput').change(function () {

        var myFile = $('#fileInput').prop('files')[0];
        var fileName = (myFile)? myFile.name:false;

        if (fileName) { 
            $("#fnameView").html(fileName);
        }else{
            $("#fnameView").html("Nincs xlsx kiválasztva!");
        }

        xlsxToJSON("fileInput","view");

        var text = `${fileName} feldolgozva!`;
        var err = "Válassz egy fájlt!";
        var uzenet = new sendMessage("#success", text, fileName, err, 5000);
        uzenet.send();

    });

    // mentés xlsx-be
    $("#exportXlsx").click(function() {
        retrieveData().then(function (AllDataObj) { 
            if (AllDataObj.length > 0) {
                var sum = AllDataObj.length;
                var savedData = 0;
                for (let x in AllDataObj) {
                    if (AllDataObj[x].apnev != "" && AllDataObj[x].aptsz != "" && AllDataObj[x].anytsz != "" && AllDataObj[x].jel != "") {
                        savedData++; 
                    }
                }
                if (!confirm("Exportálod az adatokat? "+savedData+"/"+sum)) return;
                // export xlsx
                var d = new Date();
                var y = d.getFullYear();
                var m = d.getMonth()+1;
                var filename = "nevsorplus"+y+"_"+m+".xlsx";
                var wb = XLSX.utils.book_new();
                var ws = XLSX.utils.json_to_sheet(AllDataObj);
                XLSX.utils.book_append_sheet(wb, ws, "plusdata");
                XLSX.writeFile(wb,filename);
            }else{
                var uzenet = new sendMessage("#alert", 
                        "Nincs mentve adat!", 
                        true, null, 5000
                    );
                uzenet.send();
            }
        });
    });

});
