import ReactDOM from 'react-dom';
import EditorContext from '../../adapter/editor-context';

/**
 * Calculates the position where an Widget should be displayed based on the point
 * where user interacted with the editor.
 *
 * @class WidgetPosition
 */
export default WrappedComponent =>
	class WidgetPosition extends WrappedComponent {
		static contextType = EditorContext;

		/**
		 * Lifecycle. Returns the default values of the properties used in the widget.
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @method getDefaultProps
		 */
		static defaultProps = {
			...WrappedComponent.defaultProps,
			gutter: {
				left: 0,
				top: 10,
			},
			constrainToViewport: true,
		};

		/**
		 * Cancels an scheduled animation frame.
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @method cancelAnimation
		 */
		cancelAnimation() {
			if (this._animationFrameId) {
				window.cancelAnimationFrame(this._animationFrameId);
			}
		}

		/**
		 * Returns an object which contains the position of the element in page coordinates,
		 * restricted to fit to given viewport.
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @method getConstrainedPosition
		 * @param {Object} attrs The following properties, provided as numbers:
		 * - height
		 * - left
		 * - top
		 * - width
		 * @param {Object} viewPaneSize Optional. If not provided, the current viewport will be used. Should contain at least these properties:
		 * - width
		 * @return {Object} An object with `x` and `y` properties, which represent the constrained position of the
		 * element.
		 */
		getConstrainedPosition(attrs, viewPaneSize) {
			viewPaneSize =
				viewPaneSize ||
				new CKEDITOR.dom.window(window).getViewPaneSize();

			let x = attrs.left;
			let y = attrs.top;

			if (attrs.left + attrs.width > viewPaneSize.width) {
				x -= attrs.left + attrs.width - viewPaneSize.width;
			}

			if (y < 0) {
				y = 0;
			}

			return {
				x,
				y,
			};
		}

		/**
		 * Returns the position, in page coordinates, according to which a widget should appear.
		 * Depending on the direction of the selection, the wdiget may appear above of or on bottom of the selection.
		 *
		 * It depends on the props editorEvent to analyze the following user-interaction parameters:
		 * - {Object} selectionData The data about the selection in the editor as returned from
		 * {{#crossLink "CKEDITOR.plugins.ae_selectionregion/getSelectionData:method"}}{{/crossLink}}
		 * - {Number} pos Contains the coordinates of the position, considered as most appropriate.
		 * This may be the point where the user released the mouse, or just the beginning or the end of
		 * the selection.
		 *
		 * @instance
		 * @memberof WidgetInteractionPoint
		 * @method getInteractionPoint
		 * @return {Object} An Object which contains the following properties:
		 * direction, x, y, where x and y are in page coordinates and direction can be one of these:
		 * CKEDITOR.SELECTION_BOTTOM_TO_TOP or CKEDITOR.SELECTION_TOP_TO_BOTTOM
		 */
		getInteractionPoint() {
			const eventPayload = this.props.editorEvent
				? this.props.editorEvent.data
				: null;

			if (!eventPayload) {
				return;
			}

			const selectionData = eventPayload.selectionData;

			const nativeEvent = eventPayload.nativeEvent;

			const pos = {
				x: eventPayload.nativeEvent.pageX,
				y: selectionData.region.top,
			};

			let direction = selectionData.region.direction;

			const endRect = selectionData.region.endRect;

			const startRect = selectionData.region.startRect;

			if (endRect && startRect && startRect.top === endRect.top) {
				direction = CKEDITOR.SELECTION_BOTTOM_TO_TOP;
			}

			let x;
			let y;

			// If we have the point where user released the mouse, show Toolbar at this point
			// otherwise show it on the middle of the selection.

			if (pos.x && pos.y) {
				x = this._getXPoint(selectionData, pos.x);

				if (direction === CKEDITOR.SELECTION_BOTTOM_TO_TOP) {
					y = Math.min(pos.y, selectionData.region.top);
				} else {
					y = Math.max(
						pos.y,
						this._getYPoint(selectionData, nativeEvent)
					);
				}
			} else {
				x = selectionData.region.left + selectionData.region.width / 2;

				if (direction === CKEDITOR.SELECTION_TOP_TO_BOTTOM) {
					y = this._getYPoint(selectionData, nativeEvent);
				} else {
					y = selectionData.region.top;
				}
			}

			return {
				direction,
				x,
				y,
			};
		}

		/**
		 * Returns the position of the Widget.
		 *
		 * @instance
		 * @memberof WidgetInteractionPoint
		 * @method _getXPoint
		 * @param {Object} eventX The X coordinate received from the native event (mouseup).
		 * @param {Object} selectionData The data about the selection in the editor as returned from {{#crossLink "CKEDITOR.plugins.ae_selectionregion/getSelectionData:method"}}{{/crossLink}}
		 * @protected
		 * @return {Number} The calculated X point in page coordinates.
		 */
		_getXPoint(selectionData, eventX) {
			const region = selectionData.region;

			const left = region.startRect ? region.startRect.left : region.left;
			const right = region.endRect ? region.endRect.right : region.right;

			let x;

			if (left < eventX && right > eventX) {
				x = eventX;
			} else {
				const leftDist = Math.abs(left - eventX);
				const rightDist = Math.abs(right - eventX);

				if (leftDist < rightDist) {
					// user raised the mouse on left on the selection
					x = left;
				} else {
					x = right;
				}
			}

			return x;
		}

		/**
		 * Returns the position of the Widget.
		 *
		 * @instance
		 * @memberof WidgetInteractionPoint
		 * @method _getYPoint
		 * @param {Object} nativeEvent The data about event is fired
		 * @param {Object} selectionData The data about the selection in the editor as returned from {{#crossLink "CKEDITOR.plugins.ae_selectionregion/getSelectionData:method"}}{{/crossLink}}
		 * @protected
		 * @return {Number} The calculated Y point in page coordinates.
		 */
		_getYPoint(selectionData, nativeEvent) {
			let y = 0;

			if (selectionData && nativeEvent) {
				const elementTarget = new CKEDITOR.dom.element(
					nativeEvent.target
				);

				if (
					elementTarget.$ &&
					elementTarget.getStyle('overflow') === 'auto'
				) {
					y =
						nativeEvent.target.offsetTop +
						nativeEvent.target.offsetHeight;
				} else {
					y = selectionData.region.bottom;
				}
			}

			return y;
		}

		/**
		 * Returns the position of the Widget taking in consideration the
		 * {{#crossLink "WidgetPosition/gutter:attribute"}}{{/crossLink}} attribute.
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @protected
		 * @method  getWidgetXYPoint
		 * @param {Number} left The left offset in page coordinates where Toolbar should be shown.
		 * @param {Number} top The top offset in page coordinates where Toolbar should be shown.
		 * @param {Number} direction The direction of the selection. May be one of the following:
		 * CKEDITOR.SELECTION_BOTTOM_TO_TOP or CKEDITOR.SELECTION_TOP_TO_BOTTOM
		 * @return {Array} An Array with left and top offsets in page coordinates.
		 */
		getWidgetXYPoint(left, top, direction) {
			const domNode = ReactDOM.findDOMNode(this);

			const gutter = this.props.gutter;

			if (
				direction === CKEDITOR.SELECTION_TOP_TO_BOTTOM ||
				direction === CKEDITOR.SELECTION_BOTTOM_TO_TOP
			) {
				left = left - gutter.left - domNode.offsetWidth / 2;

				top =
					direction === CKEDITOR.SELECTION_TOP_TO_BOTTOM
						? top + gutter.top
						: top - domNode.offsetHeight - gutter.top;
			} else if (
				direction === CKEDITOR.SELECTION_LEFT_TO_RIGHT ||
				direction === CKEDITOR.SELECTION_RIGHT_TO_LEFT
			) {
				left =
					direction === CKEDITOR.SELECTION_LEFT_TO_RIGHT
						? left + gutter.left + domNode.offsetHeight / 2
						: left - (3 * domNode.offsetHeight) / 2 - gutter.left;

				top = top - gutter.top - domNode.offsetHeight / 2;
			}

			if (left < 0) {
				left = 0;
			}

			if (top < 0) {
				top = 0;
			}

			return [left, top];
		}

		/**
		 * Returns true if the widget is visible, false otherwise
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @method isVisible
		 * @return {Boolean} True if the widget is visible, false otherwise
		 */
		isVisible() {
			const domNode = ReactDOM.findDOMNode(this);

			if (domNode) {
				const domElement = new CKEDITOR.dom.element(domNode);

				return domElement.hasClass('alloy-editor-visible');
			}

			return false;
		}

		/**
		 * Moves a widget from a starting point to a destination point.
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @method moveToPoint
		 * @param  {Object} startPoint The starting point for the movement.
		 * @param  {Object} endPoint The destination point for the movement.
		 */
		moveToPoint(startPoint, endPoint) {
			const domElement = new CKEDITOR.dom.element(
				ReactDOM.findDOMNode(this)
			);

			domElement.setStyles({
				left: startPoint[0] + 'px',
				top: startPoint[1] + 'px',
				opacity: 0,
				pointerEvents: 'none',
			});

			domElement.removeClass('alloy-editor-invisible');

			this._animationFrameId = window.requestAnimationFrame(() => {
				domElement.addClass('ae-toolbar-transition');
				domElement.addClass('alloy-editor-visible');
				domElement.setStyles({
					left: endPoint[0] + 'px',
					top: endPoint[1] + 'px',
					opacity: 1,
				});

				// 150ms to match transition-duration for .ae-toolbar-transition:
				setTimeout(() => {
					domElement.setStyles({
						pointerEvents: '',
					});
				}, 150);
			});
		}

		/**
		 * Shows the widget with the default animation transition.
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @method show
		 */
		show() {
			const domNode = ReactDOM.findDOMNode(this);
			const uiNode = this.context.editor.get('uiNode');

			const scrollTop = uiNode ? uiNode.scrollTop : 0;

			if (!this.isVisible() && domNode) {
				const interactionPoint = this.getInteractionPoint();

				if (interactionPoint) {
					const domElement = new CKEDITOR.dom.element(domNode);

					let finalX;
					let finalY;
					let initialX;
					let initialY;

					finalX = initialX = parseFloat(domElement.getStyle('left'));
					finalY = initialY = parseFloat(domElement.getStyle('top'));

					if (this.props.constrainToViewport) {
						const res = this.getConstrainedPosition({
							height: parseFloat(domNode.offsetHeight),
							left: finalX,
							top: finalY,
							width: parseFloat(domNode.offsetWidth),
						});

						finalX = res.x;
						finalY = res.y;
					}

					if (
						interactionPoint.direction ===
						CKEDITOR.SELECTION_TOP_TO_BOTTOM
					) {
						initialY =
							this.props.selectionData.region.bottom + scrollTop;
					} else {
						initialY =
							this.props.selectionData.region.top + scrollTop;
					}

					this.moveToPoint([initialX, initialY], [finalX, finalY]);
				}
			}
		}

		/**
		 * Updates the widget position based on the current interaction point.
		 *
		 * @instance
		 * @memberof WidgetPosition
		 * @method updatePosition
		 */
		updatePosition() {
			const interactionPoint = this.getInteractionPoint();

			const domNode = ReactDOM.findDOMNode(this);

			if (interactionPoint && domNode) {
				const uiNode =
					this.context.editor.get('uiNode') || document.body;
				const uiNodeStyle = getComputedStyle(uiNode);
				const uiNodeMarginLeft = parseInt(
					uiNodeStyle.getPropertyValue('margin-left'),
					10
				);
				const uiNodeMarginRight = parseInt(
					uiNodeStyle.getPropertyValue('margin-right'),
					10
				);
				const totalWidth =
					uiNodeMarginLeft + uiNode.clientWidth + uiNodeMarginRight;

				const scrollTop =
					uiNode.tagName !== 'BODY' ? uiNode.scrollTop : 0;

				const xy = this.getWidgetXYPoint(
					interactionPoint.x,
					interactionPoint.y,
					interactionPoint.direction
				);
				xy[1] += scrollTop;

				if (xy[0] < 0) {
					xy[0] = 0;
				}
				if (xy[0] > totalWidth - domNode.offsetWidth) {
					xy[0] = totalWidth - domNode.offsetWidth;
				}

				new CKEDITOR.dom.element(domNode).setStyles({
					left: xy[0] + 'px',
					top: xy[1] + 'px',
				});
			}
		}
	};
