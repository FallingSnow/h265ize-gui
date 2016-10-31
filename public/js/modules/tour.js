angular.module('tourModule', [])
    .service('Tour', function($compile, $rootScope, $timeout, $state) {
        class Step {
            constructor(options) {
                this.target = options.target;
                this.title = options.title || '';
                this.text = options.text || '';
                this.imagePath = options.imagePath;
                this.deactiveated = options.deactiveated;
                this.forceNoOverlay = options.forceNoOverlay;
                this.before = options.before;
                this.state = options.state;
            }
        }
        class Tour {
            constructor(options) {
                this.steps = [];
                this.visible = false;
                this.scope = $rootScope.$new();
                _.extend(this.scope, {
                    previous: () => {
                        this.previous();
                    },
                    next: () => {
                        this.next();
                    },
                    close: () => {
                        this.close();
                    },
                    steps: this.steps,
                    currentStepNum: this._currentStepNum
                });
                this.defaults = _.defaults(options.defaults, {
                    template: `<md-card>
  <img ng-src="{{imagePath | localImage}}" ng-if="imagePath" class="md-card-image">
<md-card-title ng-if="title" md-colors="::{background: 'default-primary-500'}">
  <md-card-title-text>
    <span class="md-headline">{{title}}</span>
  </md-card-title-text>
</md-card-title>
<md-card-content ng-if="text">
  <p>
    {{text}}
  </p>
</md-card-content>
<md-card-actions layout="row" layout-align="end center">
    <span class="ng-tour-step-num md-caption">{{currentStepNum + 1}}/{{steps.length}}</span>
  <md-button class="md-icon-button" aria-label="Previous" ng-click="previous()" title="Previous Step" ng-disabled="currentStepNum - 1 < 0">
    <fa name="chevron-left"></fa>
  </md-button>
  <md-button class="md-icon-button" aria-label="Next" ng-click="next()" title="Next Step" ng-disabled="currentStepNum + 1 >= steps.length">
    <fa name="chevron-right"></fa>
  </md-button>
  <md-button class="md-icon-button" aria-label="Close" ng-click="close()" title="End Tour">
    <fa name="close"></fa>
  </md-button>
</md-card-actions>
</md-card>`
                });

                if (options) {
                    if (options.steps) {
                        for (let step of options.steps) {
                            this.steps.push(_.defaults(new Step(step), this.defaults));
                        }
                    }
                }
                this._currentStepNum = 0;
            }

            addStep(step) {
                this.steps.push(step);
            }

            start() {
                this._createElements();
                angular.element(document.body).addClass('ng-tour');
                console.debug('Showing step:', this.steps[this._currentStepNum]);
                this._showStep(this.steps[this._currentStepNum]);
                this.visible = true;
            }

            previous() {
                if (this._currentStepNum - 1 >= 0) {
                    this._showStep(this.steps[--this._currentStepNum]);
                }
            }

            next() {
                if (this._currentStepNum + 1 < this.steps.length) {
                    this._showStep(this.steps[++this._currentStepNum]);
                } else
                    this.close();
            }

            close() {
                this._removeElements();
                angular.element(document.body).removeClass('ng-tour');
                this.visible = false;
            }

            _createElements() {
                this.backdrops = {
                    top: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-top'),
                    bottom: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-bottom'),
                    left: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-left'),
                    right: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-right')
                };

                this.highlighter = angular.element(document.createElement('div')).addClass('ng-tour-highlighter');

                angular.element(document.body)
                    .append(this.backdrops.top)
                    .append(this.backdrops.bottom)
                    .append(this.backdrops.left)
                    .append(this.backdrops.right)
                    .append(this.highlighter)
                    .append(this.informational);
            }

            _removeElements() {
                this.backdrops.top.remove();
                this.backdrops.bottom.remove();
                this.backdrops.left.remove();
                this.backdrops.right.remove();
                this.highlighter.remove();
                if (this.informational)
                    this.informational.remove();
            }

            _showStep(step) {
                if (this.informational)
                    this.informational.remove();
                let _self = this;
                if (step.state && $state.current.name !== step.state) {
                    new Promise(function(resolve, reject) {
                        let listener = $rootScope.$on('$viewContentLoaded', function() {
                            resolve();
                            listener();
                        });
                        $state.go(step.state);
                    }).then(resume);
                } else
                    resume();

                function resume() {
                    if (step.before)
                        step.before().then(resume2);
                    else
                        resume2();
                }

                function resume2() {

                    _self.scope.title = step.title;
                    _self.scope.text = step.text;
                    _self.scope.imagePath = step.imagePath;
                    _self.scope.currentStepNum = _self._currentStepNum;
                    let target = document.querySelector(step.target);

                    let bounds;
                    let targetFound = false;
                    let targetInWindow = false;
                    if (target) {
                        targetFound = true;
                        let targetElement = angular.element(target);
                        bounds = targetElement[0].getBoundingClientRect();

                        if (bounds.top > window.innerHeight || bounds.top < 0 ||
                            bounds.left > window.innerWidth || bounds.left < 0) {
                            targetInWindow = false;
                            console.warn(new Error(step.target + ' target not within scrollable window!'));

                            // createFakeBounds
                            let halfWindowWidth = window.innerWidth / 2;
                            let halfWindowHeight = window.innerHeight / 2;
                            bounds = {
                                width: 0,
                                height: 0,
                                left: halfWindowWidth,
                                right: halfWindowWidth,
                                top: halfWindowHeight,
                                bottom: halfWindowHeight,
                                absBottom: halfWindowHeight,
                                absRight: halfWindowWidth
                            };
                        } else {
                            targetInWindow = true;

                            targetElement.addClass('ng-tour-target');

                            bounds.absBottom = window.innerHeight - bounds.bottom;
                            bounds.absRight = window.innerWidth - bounds.right;

                            if (bounds.top > bounds.absBottom) {
                                // Closer to bottom
                            }
                            if (bounds.left > bounds.absRight) {
                                // Closer to right
                            }
                        }
                    } else {
                        // TODO: Center correctly
                        console.warn(new Error(step.target + ' target not found!'));

                        // createFakeBounds
                        let halfWindowWidth = window.innerWidth / 2;
                        let halfWindowHeight = window.innerHeight / 2;
                        bounds = {
                            width: 0,
                            height: 0,
                            left: halfWindowWidth,
                            right: halfWindowWidth,
                            top: halfWindowHeight,
                            bottom: halfWindowHeight,
                            absBottom: halfWindowHeight,
                            absRight: halfWindowWidth
                        };
                    }

                    // Top backdrop
                    _self.backdrops.top.css('height', bounds.top + 'px');

                    // Bottom backdrop
                    _self.backdrops.bottom.css('height', bounds.absBottom + 'px');

                    // Left backdrop
                    _self.backdrops.left.css('top', bounds.top + 'px').css('width', bounds.left + 'px').css('height', bounds.height + 'px');

                    // Right backdrop
                    _self.backdrops.right.css('top', bounds.top + 'px').css('width', bounds.absRight + 'px').css('height', bounds.height + 'px');

                    // Highlighter
                    _self.highlighter.css('top', bounds.top + 'px').css('left', bounds.left + 'px').css('width', bounds.width + 'px').css('height', bounds.height + 'px');

                    if (!step.deactivated)
                        _self.highlighter.addClass('deactiveated');

                    let informational = $compile(step.template)(_self.scope);
                    _self.informational = informational.addClass('ng-tour-informational');

                    if (!targetFound) {
                        _self.informational.addClass('ng-tour-target-not-found');
                    }
                    if (step.allowWide) {
                        _self.informational.addClass('ng-tour-allow-wide');
                    }

                    angular.element(document.body)
                        .append(_self.informational);

                    // Wait for informational to be appended to body, then do
                    // positioning
                    $timeout(function() {
                        if (targetFound && targetInWindow)
                            alignRelativeToTarget(bounds);
                        else
                            alignCenter(bounds);
                    });
                }

                function alignRelativeToTarget(bounds) {
                    // Try fitting on the right
                    if ((bounds.right + 10 + bounds.width) < window.innerWidth) {
                        _self.informational.css('left', (bounds.right + 10) + 'px');
                    }
                    // The left?
                    else if ((bounds.left - 10 - _self.informational[0].offsetWidth) >= 0) {
                        _self.informational.css('left', (bounds.left - 10 - _self.informational[0].offsetWidth) + 'px');
                    } else {
                        _self.informational.css('left', '0px');
                        _self.informational.overlapping = true;
                    }

                    // Force to bottom
                    if (bounds.top + _self.informational[0].offsetHeight > window.innerHeight) {

                        _self.informational.css('bottom', '0px');
                    }
                    //
                    else {
                        _self.informational.css('top', bounds.top + 'px');
                    }

                    _self.informational.addClass('visible');
                }

                function alignCenter(bounds) {
                    _self.informational.css('left', (bounds.left - _self.informational[0].offsetWidth / 2) + 'px')
                        .css('top', (bounds.top - _self.informational[0].offsetHeight / 2) + 'px');

                    _self.informational.addClass('visible');
                }

                function attemptToClearOverlap() {
                    // TODO: Clear overlap if possible
                }
            }
        }

        return Tour;
    });
