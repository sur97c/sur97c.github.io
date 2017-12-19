(function($, undefined) {
    if (!String.prototype.format) {
      String.prototype.format = function() {
        var formatted = this;
        for (var i = 0; i < arguments.length; i++) {
          var regexp = new RegExp("\\{" + i + "\\}", "gi");
          formatted = formatted.replace(regexp, arguments[i]);
        }
        return formatted;
      };
    }
    $.widget("ui.dataTable", {
      version: "1.0.0",
      widgetEventPrefix: "",
      options: {
        height: 150,
        rowHeight: 48,
        responsive: {
          showMaxColumns: 2
        },
        headerOptions: { title: "" },
        loadingIndicator: false,
        selectableRows: {
          show: false,
          multiSelect: false,
          allowSelectableAll: false
        },
        actionsRows: {
          show: false,
          actions: [{ displayName: "", handler: undefined }]
        },
        columnsDefinition: [
          {
            name: "",
            displayName: "",
            format: "",
            columnFilter: { show: false }
          }
        ],
        rowsDefinition: { stripedTable: true },
        responseDataNameDefinition: "",
        data: {
          infoFieldName: "",
          totalItemsFieldName: "",
          inject: [],
          info: null
        },
        paginationOptions: {
          show: true,
          currentPage: 1,
          itemsByPage: 5
        }
      },
      inject: {
        pagination: {
          currentPage: 0,
          itemsByPage: 0,
          totalItems: 0,
          totalPages: 0,
          fromIndex: 0,
          toIndex: 0
        },
        option: {
          search: ""
        },
        filter: {
          columns: "",
          criteria: "",
          values: "",
          filters: []
        }
      },
      _createHeader: function() {
        var self = this;
        var headerOptions = self.option("headerOptions");
        if (
          headerOptions &&
          headerOptions.show &&
          (headerOptions.title ||
            headerOptions.showColumnsOption ||
            headerOptions.showSearchOption ||
            headerOptions.showRemoveFiltersOption)
        ) {
          self._header = $('<div class="header" />');
          if (headerOptions.title) {
            self._header.append(
              '<span class="title">{0}</span>'.format(headerOptions.title)
            );
          }
          if (
            headerOptions.showColumnsOption ||
            headerOptions.showSearchOption ||
            headerOptions.showRemoveFiltersOption
          ) {
            $optionButton = $(
              '<span class="options-button"><i class="fa fa-2x fa-cogs button" /></span>'
            );
            self._header.append($optionButton);
            var $dialog = undefined;
            if (headerOptions.showSearchOption) {
              $dialog = self._addToMenuDialog(
                $dialog,
                "option",
                '<span class="menu-button"><i class="fa fa-search" />&nbsp;&nbsp;Buscar</span>',
                self.uuid,
                "menu",
                e => {
                  self._closeDialog(
                    self,
                    "option",
                    self._header.find("span.options-button.open")
                  );
                  self._openSearch();
                }
              );
              if (
                headerOptions.showColumnsOption ||
                headerOptions.showRemoveFiltersOption
              ) {
                $dialog = self._addToMenuDialog(
                  $dialog,
                  "option",
                  "<hr />",
                  self.uuid,
                  "item",
                  undefined
                );
              }
            }
            if (headerOptions.showRemoveFiltersOption) {
              $dialog = self._addToMenuDialog(
                $dialog,
                "option",
                '<span class="menu-button"><i class="fa fa-search" />&nbsp;&nbsp;Remover filtros</span>',
                self.uuid,
                "menu",
                function(e) {
                  self._closeDialog(
                    self,
                    "option",
                    self._header.find("span.options-button.open")
                  );
                  self._removeAllFilters();
                }
              );
              if (headerOptions.showColumnsOption) {
                $dialog = self._addToMenuDialog(
                  $dialog,
                  "option",
                  "<hr />",
                  self.uuid,
                  "item",
                  undefined
                );
              }
            }
            if (headerOptions.showColumnsOption) {
              var columnsDefinition = self.option("columnsDefinition");
              $.each(columnsDefinition, (i, o) => {
                $dialog = self._addToMenuDialog(
                  $dialog,
                  "option",
                  '<div class="checkbox-cell"><div class="checkbox-container {0}"><div class="container-icon"><div class="checkbox-icon"></div><span>{1}</span></div></div></div>'.format(
                    o.show ? "checked" : "",
                    o.displayName
                  ),
                  self.uuid,
                  "checkbox",
                  e => {
                    var $container = $(e.currentTarget).find(
                      "div.checkbox-container"
                    );
                    if ($container.length > 0) {
                      self._toggleCheckItem($container);
                    } else {
                      $container = $(e.currentTarget).parents(
                        "div.checkbox-container"
                      );
                      self._toggleCheckItem($container);
                    }
                    o.show = !o.show;
                    self._adjustColumn();
                  }
                );
              });
            }
            if ($dialog) {
              $dialog.hide();
              $("body").append($dialog);
            }
          }
          self._tableContainer.append(self._header);
        }
      },
      _createLoadingIndicator: function() {
        var self = this;
        var loadingIndicator = self.option("loadingIndicator");
        if (loadingIndicator) {
          self._loadingIndicator = $('<div class="loading-indicator"></div>');
          self._loadingIndicator.append('<div class="indeterminate"></div>');
          self._tableContainer.append(self._loadingIndicator);
        }
      },
      _createTableLayout: function() {
        var self = this;
        self._tableLayout = $('<div class="data-table-layout"></div>');
        self._divTable = $('<div class="div-table" />');
        self._tableLayout.append(self._divTable);
        self._tableContainer.append(self._tableLayout);
      },
      _createTableHead: function() {
        var self = this;
        self._theadHeading = $('<div class="div-table-heading"></div>');
        self._divTheadRow = $('<div class="div-table-row"></div>');
        self._divThead = $('<div class="div-table-head"></div>');
        var selectableRows = self.option("selectableRows");
        if (selectableRows && selectableRows.show) {
          var $allSelectableRows = $(
            '<div class="div-table-head checkbox-cell"><div class="checkbox-container check-all-items-button"><div class="container-icon"></div></div></div>'
          );
          if (selectableRows.multiSelect) {
            if (selectableRows.allowSelectableAll) {
              var $allSelectableRowsButton = $(
                '<div class="checkbox-icon"></div>'
              );
              $allSelectableRows
                .find(".container-icon")
                .append($allSelectableRowsButton);
            }
          } else {
            $allSelectableRows.append(
              '<div class="{0}-container"><div class="container-icon"></div></div>'.format(
                selectableRows.multiSelect ? "checkbox" : "radio"
              )
            );
          }
          self._divTheadRow.append($allSelectableRows);
        }
        var actionRows = self.option("actionsRows");
        if (actionRows && actionRows.show) {
          var $actionsRows = $('<div class="div-table-head action-cell"></div>');
          self._divTheadRow.append($actionsRows);
        }
        var columnsDefinition = self.option("columnsDefinition");
        if (columnsDefinition) {
          $.each(columnsDefinition, (i, v) => {
            var $theadCell = undefined;
            if (v.columnFilter && v.columnFilter.show) {
              $theadCell = $('<span class="filter-cell"></span>').append(
                v.displayName
              );
              $theadCell.append(
                '<span class="container-icon-filter"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M7 10l5 5 5-5z"></path></svg></span>'
              );
              var $dialog = undefined;
              var $selectedCriterion = self._createDropDown(
                "Criterio",
                v.columnFilter.criteria,
                true
              );
              var $inputValue = $(
                '<div class="input-field">' +
                  '    <input type="text" class="value-criteria" />' +
                  '<label class="ng-scope">Valor</label>' +
                  "</div>"
              );
              var $buttons = $(
                '<div class="dialog-filter-buttons"><span class="fa-stack fa-remove-filter"><i class="fa fa-filter fa-stack-1x"></i><i class="fa fa-ban fa-stack-2x"></i></span>&nbsp;<i class="fa fa-filter fa-lg"></i>&nbsp;<i class="fa fa-close fa-lg"></i></div>'
              );
              $buttons.find(".fa-remove-filter").hide();
              var $contentFilterDialog = $(
                '<div class="content-filter-dialog"></div>'
              );
              $contentFilterDialog.append($selectedCriterion);
              $contentFilterDialog.append($inputValue);
              $contentFilterDialog.append($buttons);
              $dialog = $(
                '<div id="data-table-filter-dialog-{0}-{1}" class="filter-dialog"></div>'.format(
                  i,
                  self.uuid
                )
              ).append($contentFilterDialog);
              if ($dialog) {
                $dialog.hide();
                $("body").append($dialog);
              }
            } else {
              $theadCell = $("<span></span>").append(v.displayName);
            }
            self._divThead = $(
              '<div name="{0}" column-index="{1}" class="div-table-head"></div>'.format(
                v.name,
                i
              )
            );
            self._divThead.append($theadCell);
            self._divTheadRow.append(self._divThead);
            if (v.show) {
              self._divThead.show();
            } else {
              self._divThead.hide();
            }
          });
        }
        self._theadHeading.append(self._divTheadRow);
        self._divTable.append(self._theadHeading);
      },
      _detectMobile: function() {
        var self = this;
        self._isMobile = false;
        if (
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          )
        ) {
          self._isMobile = true;
        }
        return self._isMobile;
      },
      _getColumn: function(columnName) {
        var self = this;
        var columnsDefinition = self.option("columnsDefinition");
        var column = $.grep(columnsDefinition, function(e) {
          return e.name === columnName;
        });
        return column ? column[0] : column;
      },
      _adjustColumn: function() {
        var self = this;
        self._detectMobile();
        var responsive = self.option("responsive");
        var columnsDefinition = self.option("columnsDefinition");
        if (self._isMobile) {
          var shownedColumns = 0;
          var deltaColumns = 0;
          var width = 0;
          self._tableContainer.find("tr.tbody-tr").each((i, o) => {
            var $tdRow = $(o);
            var $detailButton = $(
              "<td class='detail-button' row-index='{0}'><i class='fa fa-2x fa-chevron-right' /></td>".format(
                i
              )
            );
            shownedColumns = 0;
            deltaColumns = 0;
            $tdRow.find("td.detail-button").remove();
            width = $tdRow.width();
            $.each($tdRow.find("td"), (j, e) => {
              var $tdColumn = $(e);
              if ($tdColumn.attr("data-col")) {
                var column = self._getColumn($tdColumn.attr("data-col"));
                if (column && column.show) {
                  if (
                    shownedColumns ==
                    responsive.showMaxColumns + deltaColumns - 1
                  ) {
                    $tdColumn.css("width", width);
                    $tdColumn.show();
                    shownedColumns++;
                  } else if (
                    shownedColumns <
                    responsive.showMaxColumns + deltaColumns
                  ) {
                    $tdColumn.show();
                    width = width - $tdColumn.width() - $detailButton.width();
                    shownedColumns++;
                  } else if (
                    shownedColumns ==
                    responsive.showMaxColumns + deltaColumns
                  ) {
                    $tdColumn.hide();
                    $tdRow.append($detailButton);
                    shownedColumns++;
                  } else {
                    $tdColumn.hide();
                  }
                } else {
                  $tdColumn.hide();
                }
              } else if (
                $tdColumn.hasClass("checkbox-cell") ||
                $tdColumn.hasClass("radio-cell") ||
                $tdColumn.hasClass("action-cell")
              ) {
                deltaColumns++;
                shownedColumns++;
                width = width - 48;
                $tdColumn.css("width", 48);
                $tdColumn.show();
              }
            });
            $detailButton.off("click").on("click", function(event) {
              var $target = $(event.target);
              if ($target.hasClass("fa-chevron-open")) {
                var row = $target.parents("tr").attr("data-row");
                var $rows = $target
                  .parents("tbody")
                  .find("tr[data-row='{0}'].tbody-tr-detail".format(row));
                $.each(
                  $target
                    .parents("tbody")
                    .find("tr[data-row='{0}'].tbody-tr-detail".format(row)),
                  (i, o) => {
                    $(o).fadeOut(500, () => {
                      $(o).remove();
                    });
                  }
                );
                $target.addClass("fa-chevron-close");
                $target.removeClass("fa-chevron-open");
              } else {
                $.each(
                  $target
                    .parents("tr")
                    .find("td:hidden")
                    .reverse(),
                  (i, o) => {
                    var row = $(o)
                      .parent("tr")
                      .attr("data-row");
                    var col = $(o).attr("data-col");
                    var column = self._getColumn(col);
                    if (column && column.show) {
                      var $row = $(
                        '<tr data-row="{0}" class="tbody-tr-detail"></tr>'.format(
                          row
                        )
                      );
                      $row.hide();
                      $row.append(
                        '<td style="border-right: solid 1px #dddddd;"></td>'
                      );
                      $row.append(
                        "<td colspan='2'>{0}</td>".format(column.displayName)
                      );
                      $row.append(
                        "<td colspan='2'>{0}</div>".format(
                          self._applyFormat(self._info[row][col], column.format)
                        )
                      );
                      $row.insertAfter($target.parents("tr"));
                      $row.fadeIn(2000);
                    }
                  }
                );
                $target.addClass("fa-chevron-open");
                $target.removeClass("fa-chevron-close");
              }
              var eventValues = {
                "row-index": $target.parents("tr").attr("data-row")
              };
              self._trigger("clickDetailItem", event, eventValues);
            });
          });
          shownedColumns = 0;
          deltaColumns = 0;
          width = self._divTheadRow.width();
          self._divTheadRow.find("div.div-table-head").each((i, o) => {
            var $tdColumn = $(o);
            if ($tdColumn.attr("name")) {
              var column = self._getColumn($tdColumn.attr("name"));
              if (
                column &&
                column.show &&
                shownedColumns < responsive.showMaxColumns + deltaColumns
              ) {
                shownedColumns++;
                $tdColumn.show();
              } else {
                $tdColumn.hide();
              }
            } else if ($tdColumn.hasClass("checkbox-cell")) {
              shownedColumns++;
              deltaColumns++;
              width = width - 48;
              $tdColumn.show();
            } else if ($tdColumn.hasClass("action-cell")) {
              shownedColumns++;
              deltaColumns++;
              width = width - 48;
              $tdColumn.show();
            } else if ($tdColumn.hasClass("detail-button")) {
              $tdColumn.remove();
            } else if ($tdColumn.hasClass("scroll")) {
              $tdColumn.remove();
            }
          });
          var $tdHeads = self._tableContainer.find(
            "div.div-table-heading .div-table-row .div-table-head:visible"
          );
          $.each(self._tableContainer.find("tr:first td:visible"), (i, e) => {
            var $tdColumn = $(e);
            if (i < 3) {
              $($tdHeads[i]).css("width", $tdColumn.width() + 20);
            }
          });
        } else {
          self._divTheadRow.find("div.div-table-head").each((i, o) => {
            var $tdColumn = $(o);
            if ($tdColumn.attr("name")) {
              var column = self._getColumn($tdColumn.attr("name"));
              if (column && column.show) {
                $tdColumn.show();
              } else {
                $tdColumn.hide();
              }
            } else {
              $tdColumn.show();
            }
          });
          self._divTheadRow.find("div.div-table-head.detail-button").remove();
          self._tableContainer.find("tbody tr").each((i, o) => {
            $(o)
              .find("td")
              .each((i, e) => {
                var $tdColumn = $(e);
                if ($tdColumn.attr("data-col")) {
                  var column = self._getColumn($tdColumn.attr("data-col"));
                  if (column && column.show) {
                    $tdColumn.show();
                  } else {
                    $tdColumn.hide();
                  }
                } else {
                  $tdColumn.show();
                }
                if ($tdColumn.hasClass("detail-button")) {
                  $tdColumn.remove();
                }
              });
          });
          self._tableContainer.find("tr[data-row].tbody-tr-detail").remove();
          $.each(columnsDefinition, (i, v) => {
            $tbodyCell = self._tableContainer.find(
              "td[data-col='{0}'][data-col-index='{1}']".format(v.name, i)
            );
            if ($tbodyCell) {
              var width = self._tableContainer
                .find(
                  "div.div-table-heading .div-table-row [name='{0}']".format(
                    v.name
                  )
                )
                .width();
              $tbodyCell.css("width", width);
            }
          });
        }
        var height = self.option("height");
        if (self._tbody) {
          self._tbody.css("height", height);
        }
      },
      _addOptionsEvents: function() {
        var self = this;
        $("span.options-button")
          .find("i.fa.fa-cogs")
          .off("click")
          .on("click", function(event) {
            self._openDialog(
              self,
              $(event.currentTarget),
              "option",
              $("span.options-button")
            );
          });
        $("div.dialog-option-buttons")
          .find("i.fa.fa-close")
          .off("click")
          .on("click", function(event) {
            self._closeDialog(self, "option", $("span.options-button.open"));
          });
      },
      _addEvents: function() {
        var self = this;
        self._addOptionsEvents();
        self._checkAllItemsButtonHandler();
        self._filterColumnHandler();
        self._checkItemButtonHandler();
        self._actionButtonHandler();
        self._addPagingEvents();
      },
      _create: function() {
        var self = this;
        self._tableContainer = $(
          '<div class="data-table-container" id="data-table-{0}"></div>'.format(
            self.uuid
          )
        );
        $(window).resize(function() {
          self._adjustColumn();
          self._addEvents();
        });
        console.clear();
        self._tableContainer.appendTo(self.element);
        self._createHeader();
        self._createLoadingIndicator();
        self._createTableLayout();
        self._createTableHead();
        self._adjustColumn();
        self._addEvents();
      },
      _destroy: function() {
        var self = this;
        self._tableContainer.remove();
        $("div#data-table-filter-dialog-{0}".format(self.uuid)).remove();
        $("div#data-table-action-dialog-{0}".format(self.uuid)).remove();
        $("div#data-table-option-dialog-{0}".format(self.uuid)).remove();
      },
      _createPagination: function() {
        var self = this;
        var paginationOptions = self.option("paginationOptions");
        if (paginationOptions && paginationOptions.show) {
          var pagination = self._inject("pagination");
          var fromIndex =
            pagination.currentPage * pagination.itemsByPage -
            (pagination.itemsByPage - 1);
          var toIndex =
            pagination.currentPage * pagination.itemsByPage >
            pagination.totalItems
              ? pagination.totalItems
              : pagination.currentPage * pagination.itemsByPage;
          self._inject("pagination.fromIndex", fromIndex);
          self._inject("pagination.toIndex", toIndex);
          var $paging = self._tableContainer.find("div.paging");
          if ($paging.length == 0) {
            self._pagination = $('<div class="paging" />');
            var $rowPaging = $('<div class="row" />');
            var $pagingDropDown = $(
              '<div class="col s12 m7 right-align"><div class="navigator-container drop-down"></div></div>'
            );
            $pagingDropDown
              .find(".navigator-container")
              .append(
                self._createDropDown(
                  "Registros por página:",
                  paginationOptions.itemsByPage,
                  false
                )
              );
            var navigator =
              '<div class="col s12 m3 right-align">' +
              ' <div class="navigator-container navigator">' +
              '   <div style="padding-top: 10px"><span> de <span class="totalPages">{0}</span></span></div>'.format(
                pagination.totalPages
              ) +
              '   <div><span class="fa fa-2x fa-angle-right button" /><span class="fa fa-2x fa-angle-double-right button" /></div>' +
              '   <div><input type="number" class="input" value="{0}" min="{1}" max="{2}" /></div>'.format(
                pagination.currentPage,
                1,
                pagination.totalPages
              ) +
              '   <div><span class="fa fa-2x fa-angle-double-left button" /><span class="fa fa-2x fa-angle-left button" /></div>' +
              '   <div style="padding-top: 10px"><span>Página </span></div>' +
              " </div>" +
              "</div>";
            var $navigator = $(navigator);
            var $summary = $(
              '<div class="col s12 m2 right-align"><div class="navigator-container summary"><div style="padding-top: 10px"><span>Registros <span class="fromIndex">{0}</span> - <span class="toIndex">{1}</span> de <span class="totalItems">{2}</span></span></div></div>'.format(
                fromIndex,
                toIndex,
                pagination.totalItems
              )
            );
            $rowPaging.append($pagingDropDown);
            $rowPaging.append($navigator);
            $rowPaging.append($summary);
            self._pagination.append($rowPaging);
            self._tableContainer.append(self._pagination);
          } else {
            var currentPage = self._inject("pagination.currentPage");
            var itemsByPage = self._inject("pagination.itemsByPage");
            var totalItems = self._inject("pagination.totalItems");
            var fromIndex = self._inject("pagination.fromIndex");
            var toIndex = self._inject("pagination.toIndex");
            var totalPages = self._inject("pagination.totalPages");
            $paging.find("span.currentPage").val(currentPage);
            $paging.find("span.totalPages").text(totalPages);
            $paging.find("input[type='number']").attr("min", 1);
            $paging.find("input[type='number']").attr("max", totalPages);
            $paging.find("span.fromIndex").text(fromIndex);
            $paging.find("span.toIndex").text(toIndex);
            $paging.find("span.totalItems").text(totalItems);
          }
          self._validationButtonsNavigation();
        }
      },
      _addPagingEvents: function() {
        var self = this;
        self._itemsByPageChangeHandler();
        self._currentPageHandler();
        self._firstPageHandler();
        self._previousPageHandler();
        self._nextPageHandler();
        self._lastPageHandler();
      },
      _setValueToOjectFromString: function(instance, stringValue, value) {
        var result = instance;
        var values = stringValue.split(".");
        $.each(values, (i, o) => {
          if (result) {
            if (i == values.length - 1) {
              result[o] = value;
            } else {
              result = result[o];
            }
          }
        });
      },
      _getValueFromString: function(instance, stringValue) {
        var result = instance;
        $.each(stringValue.split("."), (i, o) => {
          if (result) {
            result = result[o];
          }
        });
        return result;
      },
      _applyFormat: function(value, format) {
        var result = value;
        if (format && format.length > 0) {
          switch (format.split("|")[0]) {
            case "datetime":
              if (format.split("|")[1] && moment) {
                result = moment(value).format(format.split("|")[1]);
              }
              break;
            default:
              break;
          }
        }
        return result;
      },
      _toggleCheckItem: function($container) {
        var self = this;
        var isChecked = $container.hasClass("checked");
        if (isChecked) {
          $container.removeClass("checked");
        } else {
          $container.addClass("checked");
        }
      },
      _createDropDown: function(label, values, dropDownDefault) {
        var dropDown = "";
        if (dropDownDefault) {
          dropDown =
            '<div class="input-field">' +
            '<div class="select-wrapper initialized">' +
            '  <span class="fa fa-1x fa-caret-down caret" />' +
            '    <input type="text" class="input" readonly="true" />' +
            '    <ul class="dropdown-content select-dropdown" />' +
            "</div>" +
            "<label>{0}</label>".format(label) +
            "</div>";
        } else {
          dropDown =
            '<div class="input-field">' +
            '<div class="select-wrapper initialized">' +
            '  <span class="fa fa-1x fa-caret-down caret" />' +
            '    <input type="text" class="input" readonly="true" />' +
            '    <ul class="dropdown-content select-dropdown" />' +
            "</div>" +
            "</div>" +
            '<div style="padding-top: 10px;"><span>{0}</span></div>'.format(
              label
            );
        }
        var $dropDown = $(dropDown);
        var valueActiveDisplayText = "";
        $.each(values, (i, o) => {
          var $value = $(
            '<li class="" value="{1}"><span>{0}</span></li>'.format(
              o.displayText,
              o.value,
              o.active ? "active selected" : ""
            )
          );
          $dropDown.find("ul.dropdown-content").append($value);
          if (o.active) {
            valueActiveDisplayText = o.displayText;
          }
          $dropDown
            .find(".input")
            .val(valueActiveDisplayText)
            .off("click")
            .on("click", event => {
              var $this = $(event.currentTarget);
              $this.addClass("active");
              $this.next("ul").css("display", "block");
            });
          $dropDown
            .find("li")
            .off("click")
            .on("click", event => {
              var $this = $(event.currentTarget);
              $dropDown.find("li").removeClass("active");
              $dropDown
                .find(".input")
                .data("value", {
                  value: $this.attr("value"),
                  text: $this.text()
                })
                .val($this.text());
              var val = $dropDown.find(".input").val();
              $dropDown.find(".text").text(val.length > 0 ? val : " ");
              $this.addClass("active");
              $this.parents("ul").css("display", "none");
            });
          var val = $dropDown.find(".input").val();
          if (val) {
            $dropDown.find(".text").text(val.length > 0 ? val : " ");
          }
        });
        return $dropDown;
      },
      _inject: function(key, value) {
        var self = this;
        if (value != undefined && value != null) {
          self._setValueToOjectFromString(self.inject, key, value);
        } else {
          value = self._getValueFromString(self.inject, key);
        }
        return value;
      },
      _loadData: function(info) {
        var self = this;
        var data = self.option("data");
        if (info && data && data.infoFieldName) {
          self._info = self._getValueFromString(info, data.infoFieldName);
          if (data.totalItemsFieldName) {
            var totalItems = self._getValueFromString(
              info,
              data.totalItemsFieldName
            );
            var itemsByPage = parseInt(self._inject("pagination.itemsByPage"));
            if (totalItems && itemsByPage > 0) {
              self._inject("pagination.totalItems", totalItems);
              var totalPages =
                parseInt(totalItems / itemsByPage) +
                (totalItems % itemsByPage > 0 ? 1 : 0);
              self._inject("pagination.totalPages", totalPages);
            }
          }
          var height = self.option("height");
          var rowHeight = self.option("rowHeight");
          if (self._divTheadRow.find("div.div-table-head.scroll").length > 0) {
            self._divTheadRow.find("div.div-table-head.scroll").remove();
          }
          if (self._info && self._info.length * rowHeight >= height) {
            self._divTheadRow.append('<div class="div-table-head scroll"></div>');
          }
          if (self._info && self._info.length > 0) {
            $.each(self._info, (i, o) => {
              self._tbodyRow = $(
                "<tr class='tbody-tr' data-row='{0}'></tr>".format(i)
              );
              var $tbodyCell = null;
              var selectableRows = self.option("selectableRows");
              if (selectableRows && selectableRows.show) {
                $tbodyCell = $(
                  '<td class="{0}-cell"></td>'.format(
                    selectableRows.multiSelect ? "checkbox" : "radio"
                  )
                );
                if (selectableRows.multiSelect) {
                  $tbodyCell.append(
                    '<div class="checkbox-container check-item-button"><div class="container-icon"><div class="{0}-icon"></div></div></div>'.format(
                      selectableRows.multiSelect ? "checkbox" : "radio"
                    )
                  );
                } else {
                  $tbodyCell.append(
                    '<div class="{0}-container check-item-button"><div class="container-icon"><span class="fa-stack fa-radio-button"><i class="fa fa-circle-o fa-stack-2x {0}-icon"></i><i class="fa fa-circle fa-stack-2x {0}-icon"></i></span></div></div>'.format(
                      selectableRows.multiSelect ? "checkbox" : "radio"
                    )
                  );
                }
                self._tbodyRow.append($tbodyCell);
              }
              var actionsRows = self.option("actionsRows");
              if (actionsRows && actionsRows.show) {
                $tbodyCell = $('<td class="action-cell"></td>');
                $tbodyCell.append(
                  '<div class="action-container action-item-button"><div class="container-icon"><i class="fa fa-ellipsis-v fa-2x action-icon"></i></div></div>'
                );
                self._tbodyRow.append($tbodyCell);
              }
              var columnsDefinition = self.option("columnsDefinition");
              if (columnsDefinition) {
                $.each(columnsDefinition, (i, v) => {
                  if (v.cellTemplate) {
                    $tbodyCell = $(
                      "<td data-col='{0}' data-col-index='{1}'></td>".format(
                        v.name,
                        i
                      )
                    ).append(v.cellTemplate);
                  } else {
                    $tbodyCell = $(
                      "<td data-col='{0}' data-col-index='{1}'></td>".format(
                        v.name,
                        i
                      )
                    ).append(self._applyFormat(o[v.name], v.format));
                  }
                  self._tbodyRow.append($tbodyCell);
                });
              }
              self._tbody.append(self._tbodyRow);
              if (actionsRows && actionsRows.show) {
              }
            });
            self._createPagination();
            self._addEvents();
          }
        }
        self._adjustColumn();
        self._adjustColumn();
      },
      _setOption: function(name, value) {
        $.Widget.prototype._setOption.apply(this, arguments);
      },
      _destroy: function() {},
      _addToMenuDialog: ($dialog, type, displayName, uuid, itemType, handler) => {
        var $menuDialog = $(
          '<div class="content-{0}-{1}-dialog">{2}</div>'.format(
            type,
            itemType,
            displayName
          )
        );
        if ($dialog) {
          $dialog.find("div.content-{0}-dialog".format(type)).append($menuDialog);
        } else {
          $dialog = $(
            '<div id="data-table-{0}-dialog-{1}" class="{0}-dialog"></div>'.format(
              type,
              uuid
            )
          );
          var $contentDialog = $(
            "<div class='content-{0}-dialog'></div>".format(type)
          );
          var $buttons = $(
            '<div class="dialog-{0}-buttons"><i class="fa fa-close fa-lg"></i></div>'.format(
              type
            )
          );
          $contentDialog.append($buttons);
          $contentDialog.append($menuDialog);
        }
        if (handler) {
          $menuDialog.click(event => {
            handler(event);
          });
        }
        $dialog.append($contentDialog);
        return $dialog;
      },
      _setPosition: function($target, $dialog, type) {
        var self = this;
        var bodySize = { height: $("body").height(), width: $("body").width() };
        var dialogSize = { height: $dialog.height(), width: $dialog.width() };
        var dialogOffset = { top: 0, left: 0 };
        switch (type) {
          case "filter":
            var $targetParent = $target.parents("div.div-table-head");
            var offsetDelta = { top: -8, left: 2 };
            dialogOffset.top =
              $targetParent.offset().top + $targetParent.height() - 8;
            dialogOffset.left = $targetParent.offset().left + 2;
            if (dialogOffset.left + dialogSize.width > bodySize.width) {
              dialogOffset.left =
                dialogOffset.left - dialogSize.width + $target.width() + 10;
            }
            break;
          case "option":
            dialogOffset.top = $target.offset().top + $target.height();
            dialogOffset.left =
              $target.offset().left - dialogSize.width + $target.width();
            break;
          case "action":
            dialogOffset.top = $target.offset().top + $target.height() + 10;
            dialogOffset.left = $target.offset().left;
            break;
        }
        $dialog.css("top", dialogOffset.top);
        $dialog.css("left", dialogOffset.left);
        return $dialog;
      },
      _openDialog: (self, $target, type, $button) => {
        var self = self ? self : this;
        var columnIndex = $target.parent("div").attr("column-index");
        var $dialog = undefined;
        if (columnIndex) {
          $dialog = $(
            "div#data-table-{0}-dialog-{1}-{2}".format(
              type,
              columnIndex,
              self.uuid
            )
          );
        } else {
          $dialog = $("div#data-table-{0}-dialog-{1}".format(type, self.uuid));
        }
        $("[id*='data-table-'].option-dialog").hide();
        $("[id*='data-table-'].filter-dialog").hide();
        $("[id*='data-table-'].action-dialog").hide();
        self._tableContainer.find("span.open").removeClass("open");
        self._tableContainer.find("div.open").removeClass("open");
        $button.addClass("open");
        $dialog = self._setPosition($target, $dialog, type);
        if ($dialog) {
          $dialog.show();
        }
        return $dialog;
      },
      _closeDialog: (self, type, $button) => {
        var self = self ? self : this;
        var $dialog = $("div.{0}-dialog".format(type));
        if ($button) {
          $button.removeClass("open");
        }
        if ($dialog) {
          $dialog.hide();
        }
      },
      _openSearch: () => {
        alert("Search....");
      },
      _removeAllFilters: function() {
        var self = this;
        self._inject("filter.filters", []);
        self._inject("filter.columns", "");
        self._inject("filter.criteria", "");
        self._inject("filter.values", "");
        alert("Remove all filters");
      },
      _checkAllItemsButtonHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.check-all-items-button")
          .off("click")
          .on("click", function(event) {
            var $target = $(event.currentTarget);
            self._toggleCheckItem($target);
            if ($target.hasClass("checked")) {
              self._tableContainer
                .find("div.check-item-button")
                .not(".checked")
                .trigger("click");
            } else {
              self._tableContainer.find("div.check-item-button").trigger("click");
            }
            //dataTableEvent checkAllItems(checkAllItems)
            var eventValues = { checkAllItems: $target.hasClass("checked") };
            self._trigger("checkAllItems", event, eventValues);
          });
      },
      _addFilter: function(filter) {
        var self = this;
        var filters = self._inject("filter.filters");
        filters = self._removeFilter(filter.column);
        filters.unshift(filter);
        self._inject("filter.filters", filters);
        var columns = "";
        var criteria = "";
        var values = "";
        columns = filters
          .map(e => {
            return e.column;
          })
          .join("%20");
        criteria = filters
          .map(e => {
            return e.criterion;
          })
          .join("%20");
        values = filters
          .map(e => {
            return e.value;
          })
          .join("%20");
        self._inject("filter.columns", columns);
        self._inject("filter.criteria", criteria);
        self._inject("filter.values", values);
        return filters;
      },
      _removeFilter: function(column) {
        var self = this;
        var filters = self._inject("filter.filters");
        filters = $.grep(filters, function(e) {
          return e.column != column;
        });
        var columns = "";
        var criteria = "";
        var values = "";
        columns = filters
          .map(e => {
            return e.column;
          })
          .join("%20");
        criteria = filters
          .map(e => {
            return e.criterion;
          })
          .join("%20");
        values = filters
          .map(e => {
            return e.value;
          })
          .join("%20");
        self._inject("filter.filters", filters);
        self._inject("filter.columns", columns);
        self._inject("filter.criteria", criteria);
        self._inject("filter.values", values);
        return filters;
      },
      _clearFilter: function() {
        var self = this;
        self._inject("filter.filters", []);
        self._inject("filter.columns", "");
        self._inject("filter.criteria", "");
        self._inject("filter.values", "");
      },
      _filterColumnHandler: function() {
        var self = this;
        var columnsDefinition = self.option("columnsDefinition");
        if (columnsDefinition) {
          $.each(columnsDefinition, (i, v) => {
            if (v.columnFilter && v.columnFilter.show) {
              self._tableContainer
                .find("div[name='{0}'] .filter-cell".format(v.name))
                .off("click")
                .on("click", function(event) {
                  var $target = $(event.currentTarget);
                  var $dialog = self._openDialog(
                    self,
                    $target,
                    "filter",
                    $target
                  );
                  $dialog
                    .find(".fa-remove-filter")
                    .off("click.buttons.dataTable")
                    .on("click.buttons.dataTable", event => {
                      v.columnFilter.filter = undefined;
                      var $currentDialog = $(
                        "div#data-table-filter-dialog-{0}-{1}".format(
                          i,
                          self.uuid
                        )
                      );
                      var $criterion = $currentDialog.find("input.input.active");
                      var $value = $currentDialog.find("input.value-criteria");
                      $value.val("");
                      $(
                        "div#data-table-filter-dialog-{0}-{1}".format(
                          i,
                          self.uuid
                        )
                      )
                        .find(".fa-remove-filter")
                        .hide();
                      $("span.filter-cell.open").removeClass("filter");
                      self._closeDialog(
                        self,
                        "filter",
                        $("span.filter-cell.open")
                      );
                      //dataTableEvent filterRemove(filters)
                      var filters = self._removeFilter(v.name);
                      var eventValues = filters;
                      self._trigger("filterRemove", event, eventValues);
                      self.refresh();
                      //dataTableEvent filterRemoved(filters)
                      self._trigger("filterRemoved", event, eventValues);
                    });
                  $dialog
                    .find(".fa-filter")
                    .off("click.buttons.dataTable")
                    .on("click.buttons.dataTable", event => {
                      var $currentDialog = $(
                        "div#data-table-filter-dialog-{0}-{1}".format(
                          i,
                          self.uuid
                        )
                      );
                      var $criterion = $currentDialog.find("input.input.active");
                      var $value = $currentDialog.find("input.value-criteria");
                      if (
                        ($criterion.data("value").value != 0 ||
                          $criterion.data("value").value != "") &&
                        $value.val() != ""
                      ) {
                        v.columnFilter.filter = {
                          column: v.name,
                          criterion: $criterion.data("value").value,
                          value: $value.val()
                        };
                        $currentDialog.find(".fa-remove-filter").show();
                        $("span.filter-cell.open").addClass("filter");
                        self._closeDialog(
                          self,
                          "filter",
                          $("span.filter-cell.open")
                        );
                        //dataTableEvent filterChange(filters)
                        console.log(v.columnFilter.filter);
                        var filters = self._addFilter(v.columnFilter.filter);
                        var eventValues = filters;
                        self._trigger("filterChange", event, eventValues);
                        self.refresh();
                        //dataTableEvent filterChanged(filters)
                        self._trigger("filterChanged", event, eventValues);
                      }
                    });
                  $dialog
                    .find(".fa-close")
                    .off("click.buttons.dataTable")
                    .on("click.buttons.dataTable", event => {
                      self._closeDialog(
                        self,
                        "filter",
                        $("span.filter-cell.open")
                      );
                    });
                });
            }
          });
        }
      },
      _getCurrentItem: function(index, empty) {
        var self = this;
        var result = undefined;
        var item = $.grep(self._info, (o, i) => {
          if (i == index) return o;
        });
        if (item && item.length > 0) {
          result = item[0];
        } else {
          if (empty) {
            result = {};
          }
        }
        return result;
      },
      _checkItemButtonHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.check-item-button")
          .off("click")
          .on("click", function(event) {
            var $target = $(event.currentTarget);
            var selectableRows = self.option("selectableRows");
            if (selectableRows.multiSelect) {
            } else {
              self._tableContainer.find("tr").removeClass("selectedRow");
              self._tableContainer
                .find(".radio-container")
                .removeClass("checked");
            }
            self._toggleCheckItem($target);
            if ($target.parents("tr").hasClass("selectedRow")) {
              $target.parents("tr").removeClass("selectedRow");
            } else {
              $target.parents("tr").addClass("selectedRow");
            }
            var index = $target.parents("tr").attr("data-row");
            //dataTableEvent selectedItem(index, selected)
            var eventValues = {
              index: index,
              selected: self._getCurrentItem(index)
            };
            self._trigger("selectedItem", event, eventValues);
          });
      },
      _actionButtonHandler: function() {
        var self = this;
        var actionsRows = self.option("actionsRows");
        if (actionsRows && actionsRows.show && actionsRows.actions) {
          var hasDialog = $("body").find(
            "#data-table-action-dialog-{0}".format(self.uuid)
          ).length;
          if (hasDialog > 0) {
          } else {
            $.each(actionsRows.actions, (i, o) => {
              self._actionDialog = self._addToMenuDialog(
                self._actionDialog,
                "action",
                '<span class="menu-button">&nbsp;&nbsp;{0}</span>'.format(
                  o.displayName
                ),
                self.uuid,
                "menu",
                e => {
                  var $target = $(".action-container.action-item-button.open");
                  var rowIndex = $target.parents("tr").attr("data-row");
                  var item = self._getCurrentItem(rowIndex, true);
                  var eventValues = undefined;
                  eventValues = {
                    action: o.displayName,
                    index: rowIndex,
                    item: item
                  };
                  self._closeDialog(
                    self,
                    "action",
                    $("div.action-item-button.open")
                  );
                  o.handler(
                    $.extend(
                      {
                        action: o.displayName,
                        index: rowIndex
                      },
                      item
                    )
                  );
                  //dataTableEvent onActionClick(action, index, item)
                  self._trigger("onActionClick", e, eventValues);
                }
              );
            });
            if (self._actionDialog) {
              self._actionDialog.hide();
              $("body").append(self._actionDialog);
            }
          }
        }
        self._tableContainer
          .find("div.action-item-button")
          .off("click")
          .on("click", function(event) {
            var $target = $(event.currentTarget);
            self._openDialog(self, $target, "action", $target);
            //dataTableEvent onDialogActionOpen(o.displayName, $target.parents("tr").attr("data-row"))
            var eventValues = {
              "row-index": $target.parents("tr").attr("data-row")
            };
            self._trigger("onDialogActionOpen", event, eventValues);
          });
        self._actionDialog
          .find("i.fa.fa-close")
          .off("click")
          .on("click", function(event) {
            self._closeDialog(self, "action", $("div.action-item-button.open"));
          });
      },
      _itemsByPageChangeHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.paging")
          .find("li")
          .off("click.paging")
          .on("click.paging", function(event) {
            var $target = $(event.currentTarget);
            var paginationOptions = self.option("paginationOptions");
            $.each(paginationOptions.itemsByPage, (i, o) => {
              if (o.value == $target.val()) {
                o.active = true;
              } else {
                o.active = false;
              }
            });
            var oldValue = self._inject("pagination.itemsByPage");
            self._inject("pagination.itemsByPage", $target.val());
            //dataTableEvent onItemsByPageChange(oldValue, newValue)
            var eventValues = { oldValue: oldValue, newValue: $target.val() };
            self._trigger("itemsByPageChange", event, eventValues);
            self.refresh();
            //dataTableEvent onItemsByPageChanged(oldValue, newValue)
            var eventValues = {};
            self._trigger("itemsByPageChanged", event, eventValues);
          });
      },
      _currentPageHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.paging")
          .find("input[type='number']")
          .off("change.paging")
          .on("change.paging", function(event) {
            var $target = $(event.currentTarget);
            $target.blur();
            var oldValue = self._inject("pagination.currentPage");
            self._inject("pagination.currentPage", $target.val());
            //console.log("dataTableEvent onCurrentPageChange", oldValue, newValue);
            var eventValues = { oldValue: oldValue, newValue: $target.val() };
            self._trigger("currentPageChange", event, eventValues);
            self.refresh();
            //console.log("dataTableEvent onCurrentPageChanged", oldValue, newValue);
            self._trigger("currentPageChanged", event, eventValues);
          });
      },
      _validationButtonsNavigation: function() {
        var self = this;
        var totalPages = self._inject("pagination.totalPages");
        var currentPage = self._inject("pagination.currentPage");
        self._tableContainer
          .find("div.paging")
          .find("input[type='number']")
          .val(currentPage);
        var $buttonFirst = self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-double-left.button");
        var $buttonPrevious = self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-left.button");
        var $buttonNext = self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-right.button");
        var $buttonLast = self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-double-right.button");
        if (currentPage == 1) {
          $buttonFirst.addClass("disabled");
          $buttonPrevious.addClass("disabled");
        } else {
          $buttonFirst.removeClass("disabled");
          $buttonPrevious.removeClass("disabled");
        }
        if (currentPage == totalPages) {
          $buttonNext.addClass("disabled");
          $buttonLast.addClass("disabled");
        } else {
          $buttonNext.removeClass("disabled");
          $buttonLast.removeClass("disabled");
        }
      },
      _firstPageHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-double-left.button")
          .off("click.paging")
          .on("click.paging", function(event) {
            var $target = $(event.currentTarget);
            if ($target.hasClass("disabled")) {
            } else {
              var oldValue = self._inject("pagination.currentPage");
              self._inject("pagination.currentPage", 1);
              self._validationButtonsNavigation();
              //console.log("dataTableEvent onFirstPageChange", oldValue, 1);
              var eventValues = { oldValue: oldValue, newValue: 1 };
              self._trigger("firstPageChange", event, eventValues);
              self.refresh();
              //console.log("dataTableEvent onFirstPageChanged", oldValue, 1);
              self._trigger("firstPageChanged", event, eventValues);
            }
          });
      },
      _previousPageHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-left.button")
          .off("click.paging")
          .on("click.paging", function(event) {
            var $target = $(event.currentTarget);
            if ($target.hasClass("disabled")) {
            } else {
              var oldValue = self._inject("pagination.currentPage");
              self._inject("pagination.currentPage", oldValue - 1);
              self._validationButtonsNavigation();
              //console.log("dataTableEvent onPreviousPageChange", oldValue, oldValue - 1);
              var eventValues = { oldValue: oldValue, newValue: oldValue - 1 };
              self._trigger("previousPageChange", event, eventValues);
              self.refresh();
              //console.log("dataTableEvent onPreviousPageChanged", oldValue, oldValue - 1);
              self._trigger("previousPageChanged", event, eventValues);
            }
          });
      },
      _nextPageHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-right.button")
          .off("click.paging")
          .on("click.paging", function(event) {
            var $target = $(event.currentTarget);
            if ($target.hasClass("disabled")) {
            } else {
              var oldValue = self._inject("pagination.currentPage");
              self._inject("pagination.currentPage", oldValue + 1);
              self._validationButtonsNavigation();
              //console.log("dataTableEvent onNextPageChange", oldValue, oldValue + 1);
              var eventValues = { oldValue: oldValue, newValue: oldValue + 1 };
              self._trigger("nextPageChange", event, eventValues);
              self.refresh();
              //console.log("dataTableEvent onNextPageChanged", oldValue, oldValue + 1);
              self._trigger("nextPageChanged", event, eventValues);
            }
          });
      },
      _lastPageHandler: function() {
        var self = this;
        self._tableContainer
          .find("div.paging")
          .find("span.fa-angle-double-right.button")
          .off("click.paging")
          .on("click.paging", function(event) {
            var $target = $(event.currentTarget);
            if ($target.hasClass("disabled")) {
            } else {
              var oldValue = self._inject("pagination.currentPage");
              var totalPages = self._inject("pagination.totalPages");
              self._inject("pagination.currentPage", totalPages);
              self._validationButtonsNavigation();
              //console.log("dataTableEvent onLastPageChange", oldValue, totalPages);
              var eventValues = { oldValue: oldValue, newValue: totalPages };
              self._trigger("lastPageChange", event, eventValues);
              self.refresh();
              //console.log("dataTableEvent onLasttPageChanged", oldValue, totalPages);
              self._trigger("lastPageChanged", event, eventValues);
            }
          });
      },
      refresh: function() {
        var self = this;
        self._tbody.find("tr").remove();
        self.load();
      },
      load: function() {
        var self = this;
        self._table = self._tableContainer.find("table");
        if (self._table && self._table.length > 0) {
        } else {
          self._table = $("<table></table>");
          self._tbody = $("<tbody></tbody>");
          self._table.append(self._tbody);
          self._tableLayout.append(self._table);
        }
        var rowsDefinition = self.option("rowsDefinition");
        if (rowsDefinition && rowsDefinition.stripedTable) {
          self._tbody.addClass("striped-table");
        }
        var data = self.option("data");
        if (data && data.info) {
          var paginationOptions = self.option("paginationOptions");
          if (paginationOptions && paginationOptions.show) {
            var currentPage = self._inject("pagination.currentPage");
            self._inject(
              "pagination.currentPage",
              currentPage > 0 ? currentPage : paginationOptions.currentPage
            );
            $.each(paginationOptions.itemsByPage, (i, o) => {
              if (o.active) {
                self._inject("pagination.itemsByPage", o.value);
              }
            });
          }
          var injectValues = [];
          if (data.inject) {
            $.each(data.inject, (i, o) => {
              var value = self._inject(o);
              injectValues[i] = value;
            });
          }
          if ($.isFunction(data.info)) {
            var response = data.info.apply(this, injectValues);
            if (
              response.__proto__ !== undefined &&
              response.__proto__.hasOwnProperty("then")
            ) {
              var loadingIndicator = self.option("loadingIndicator");
              if (loadingIndicator) {
                self._loadingIndicator.show("slow", () => {
                  response.then(res => {
                    self._loadData(res);
                    self._loadingIndicator.hide("slow");
                  });
                });
              } else {
                data.info(injectValues).then(response => {
                  self._loadData(response);
                });
              }
            } else if ($.isArray(response)) {
              self._loadData(response);
            }
          } else if ($.isArray(data.info)) {
            self._loadData(data.info);
          }
        }
        self._validationButtonsNavigation();
      }
    });
  })(jQuery);
  