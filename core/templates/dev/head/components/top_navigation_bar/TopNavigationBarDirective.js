// Copyright 2016 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Directive for the top navigation bar. This excludes the part
 * of the navbar that is used for local navigation (such as the various tabs in
 * the editor pages).
 */

oppia.directive('topNavigationBar', [function() {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'components/topNavigationBar',
    controller: [
      '$scope', '$http', '$window', '$timeout', 'UrlInterpolationService',
      'SidebarStatusService', 'LABEL_FOR_CLEARING_FOCUS',
      'siteAnalyticsService', 'windowDimensionsService',
      function(
          $scope, $http, $window, $timeout, UrlInterpolationService,
          SidebarStatusService, LABEL_FOR_CLEARING_FOCUS,
          siteAnalyticsService, windowDimensionsService) {
        var NAV_MODE_SIGNUP = 'signup';
        var NAV_MODES_WITH_CUSTOM_LOCAL_NAV = [
          'create', 'explore', 'collection'];
        $scope.NAV_MODE = GLOBALS.NAV_MODE;
        $scope.LABEL_FOR_CLEARING_FOCUS = LABEL_FOR_CLEARING_FOCUS;
        $scope.getStaticImageUrl = UrlInterpolationService.getStaticImageUrl;

        $scope.username = GLOBALS.username;
        $scope.profilePictureDataUrl = GLOBALS.profilePictureDataUrl;
        $scope.isAdmin = GLOBALS.isAdmin;
        $scope.isModerator = GLOBALS.isModerator;
        $scope.isSuperAdmin = GLOBALS.isSuperAdmin;
        $scope.logoutUrl = GLOBALS.logoutUrl;
        if ($scope.username) {
          $scope.profilePageUrl = UrlInterpolationService.interpolateUrl(
            '/profile/<username>', {
              username: $scope.username
            });
        }
        $scope.userMenuIsShown = ($scope.NAV_MODE !== NAV_MODE_SIGNUP);
        $scope.standardNavIsShown = (
          NAV_MODES_WITH_CUSTOM_LOCAL_NAV.indexOf($scope.NAV_MODE) === -1);

        $scope.onLoginButtonClicked = function() {
          siteAnalyticsService.registerStartLoginEvent('loginButton');
          $timeout(function() {
            $window.location = GLOBALS.loginUrl;
          }, 150);
        };

        $scope.profileDropdownIsActive = false;
        $scope.onMouseoverProfilePictureOrDropdown = function(evt) {
          angular.element(evt.currentTarget).parent().addClass('open');
          $scope.profileDropdownIsActive = true;
        };
        $scope.onMouseoutProfilePictureOrDropdown = function(evt) {
          angular.element(evt.currentTarget).parent().removeClass('open');
          $scope.profileDropdownIsActive = false;
        };

        $scope.onMouseoverDropdownMenu = function(evt) {
          angular.element(evt.currentTarget).parent().addClass('open');
        };
        $scope.onMouseoutDropdownMenu = function(evt) {
          angular.element(evt.currentTarget).parent().removeClass('open');
        };

        if (GLOBALS.userIsLoggedIn) {
          // Show the number of unseen notifications in the navbar and page
          // title, unless the user is already on the dashboard page.
          $http.get('/notificationshandler').then(function(response) {
            var data = response.data;
            if ($window.location.pathname !== '/') {
              $scope.numUnseenNotifications = data.num_unseen_notifications;
              if ($scope.numUnseenNotifications > 0) {
                $window.document.title = (
                  '(' + $scope.numUnseenNotifications + ') ' +
                  $window.document.title);
              }
            }
          });
        }

        $scope.windowIsNarrow = windowDimensionsService.isWindowNarrow();
        var handleOverflowResizeTimer;
        var initialWindowWidth = windowDimensionsService.getWidth();
        var hideNavElements = {
          I18N_TOPNAV_DONATE: false,
          I18N_TOPNAV_ABOUT: false,
          I18N_CREATE_EXPLORATION_CREATE: false,
          I18N_TOPNAV_LIBRARY: false
        };

        windowDimensionsService.registerOnResizeHook(function() {
          $scope.windowIsNarrow = windowDimensionsService.isWindowNarrow();
          $scope.$apply();
          // Close the sidebar, if necessary.
          SidebarStatusService.closeSidebar();
          // Limit calls to handleOverflow() to one per 500ms to prevent flicker
          $timeout.cancel(handleOverflowResizeTimer);

          // If the window is resized larger, try displaying the hidden elements
          if (initialWindowWidth < windowDimensionsService.getWidth()) {
            $.each(hideNavElements, function(element, state) {
              if (state === true) {
                $('[translate=' + element + ']')
                  .closest('div, li').css('display', 'block');
                hideNavElements[element] = false;
              }
            });
          }
          initialWindowWidth = windowDimensionsService.getWidth();
          handleOverflowResizeTimer = $timeout(handleOverflow, 500);
        });

        var handleOverflow = function() {
          if (windowDimensionsService.getWidth() < 768) {
            return false;
          }

          var navReady = true;
          // Wait until i18n is completed.
          $('.oppia-navbar-tabs a[translate], ' +
            '.oppia-navbar-tabs span[translate]').each(function(i, element) {
              if (element.innerText.length === 0) {
                $timeout(handleOverflow, 100);
                navReady = false;
                return false;
              }
            });
          if (!navReady) {
            return false;
          }

          var navWidth = 0;
          $('ul.oppia-navbar-tabs').children().each(function(i, element) {
            // Some nav elements have invalid widths from floating
            // Use widths of their first-level child elements instead
            if (element.clientWidth === 0 || element.clientWidth >= 176) {
              $(element).children().each(function(i, element) {
                navWidth += 5;
                navWidth += element.clientWidth;
              });
            } else {
              navWidth += 5;
              navWidth += element.clientWidth;
            }
          });

          if ($('ul.nav.oppia-navbar-profile').length > 0) {
            navWidth += $('ul.nav.oppia-navbar-profile').width();
          }

          $('ul.nav.oppia-navbar-tabs').css('min-width', navWidth);

          if ($('div.collapse.navbar-collapse').height() > 60) {
            $.each(hideNavElements, function(element, state) {
              if (state === false) {
                $('[translate=' + element + ']')
                  .closest('div, li').css('display', 'None');
                hideNavElements[element] = true;
                $timeout(handleOverflow, 10);
                return false;
              }
            });
          }
        };

        // For Chrome, timeout 0 appears to run after i18n.
        $timeout(handleOverflow, 0);
        $scope.toggleSidebar = SidebarStatusService.toggleSidebar;
      }
    ]
  };
}]);
