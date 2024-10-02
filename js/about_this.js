var modalHeader = `
    <h3>    
        About SNR Report with sr-525hd
    </h3>
`;

var modalBody = `
    <p>
        This project was created for anyone can freely monitor their device.
    </p>
    <p>
        The project was created with html, css, javascript for a local internal network.
        Do not make it available over the Internet because
        it does not contain adequate security solutions for this!
        If you do, be careful! Take the proper precautions!
    </p>
    <p>
        Copyright (C) 2024 Csnyi </br>

        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version.</br>

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU General Public License for more details.</br>

        You should have received a copy of the GNU General Public License
        along with this program.  If not, see <a href="https://www.gnu.org/licenses/" target="_blank"> here</a>.
    </p>
    <p>
        We welcome all observations and comments.
    </p>
    <p>
        The project is available: <a href="https://github.com/Csnyi/RAMFstbDiagnostic.git" target="_blank">GitHub</a>.
    </p>
`;

var modalFooter = `
    <p>
        Powered by 
        <a href="https://www.w3schools.com/css/css_rwd_intro.asp" target="_blank"> W3Schools</a> | 
        <a href="https://jquery.com" target="_blank">jQuery</a> | 
        <a href="https://plotly.com" target="_blank">PlotlyJS</a> | 
        <a href="https://sheetjs.com" target="_blank">SheetJS</a> | 
        <a href="https://datatables.net/" target="_blank">DataTables</a>
    </p>
`;

var modalHelpCr = `
    <table class="helpinfo" style="width:100%">
        <tr>
            <th>
                Create report
            </th>
        </tr>
        <tr>
            <td>
                Make a report and look at the data again if you like!
            </td>
        </tr>
        <tr>
            <th> 
                View
            </th> 
        </tr>
        <tr> 
            <td>
            </td>
        </tr>
        <tr>
            <th>
                Setup
            </th>
        </tr>
        <tr>
            <td>
            </td>
        </tr>
    </table>
`;

var modalHelpSnr = `
    <table class="helpinfo" style="width:100%">
        <tr>
            <th>
                Measurement
            </th>
        </tr>
        <tr>
            <td>
                If you do not enter a time (in minutes), 
                it will measure until you stop it with Stop.
                It stops automatically when the time is set.
                After measurement, export the data to json so that you can look back at the results in the API.
                If you also want to export to Excel, you can do so directly after the measurement.
                The reason for this is that the data is stored in memory to the display of the graph 
                and the data is lost when updating or closing the window.
            </td>
        </tr>
        <tr>
            <th> 
                View
            </th> 
        </tr>
        <tr> 
            <td>
            </td>
        </tr>
        <tr>
            <th>
                Setup
            </th>
        </tr>
        <tr>
            <td>
            </td>
        </tr>
    </table>
`;

$("#modal-header").append(modalHeader);
$("#modal-body").append(modalBody);
$("#modal-footer").append(modalFooter);
$("#modal-help-cr").append(modalHelpCr);
$("#modal-help-snr").append(modalHelpSnr);