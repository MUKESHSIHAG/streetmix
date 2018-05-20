import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Triangle from './Triangle'
import RemoveButton from './RemoveButton'
import Variants from './Variants'
import WidthControl from './WidthControl'
import BuildingHeightControl from './BuildingHeightControl'
import Warnings from './Warnings'
import Description from './Description.jsx'
import { infoBubble } from './info_bubble'
import {
  INFO_BUBBLE_TYPE_SEGMENT,
  INFO_BUBBLE_TYPE_LEFT_BUILDING,
  INFO_BUBBLE_TYPE_RIGHT_BUILDING
} from './constants'
import { getDescriptionData } from './description'
import { cancelFadeoutControls, resumeFadeoutControls } from '../segments/resizing'
// import { trackEvent } from '../app/event_tracking'
import { BUILDINGS } from '../segments/buildings'
import { getSegmentInfo, getSegmentVariantInfo } from '../segments/info'
import { loseAnyFocus } from '../util/focus'
import { getElAbsolutePos } from '../util/helpers'
import { setInfoBubbleMouseInside } from '../store/actions/infoBubble'
import { t } from '../app/locale'

class InfoBubble extends React.Component {
  static propTypes = {
    visible: PropTypes.bool.isRequired,
    dataNo: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    descriptionVisible: PropTypes.bool,
    setInfoBubbleMouseInside: PropTypes.func,
    street: PropTypes.object,
    system: PropTypes.object
  }

  static defaultProps = {
    visible: false
  }

  constructor (props) {
    super(props)

    // Stores a ref to the element
    this.el = null

    this.state = {
      type: null,
      highlightTriangle: false
    }
  }

  /**
   * Sets state when the infobubble is pointing at a building
   *
   * @param {Object} nextProps
   * @param {Object} prevState
   */
  static getDerivedStateFromProps (nextProps, prevState) {
    if (nextProps.dataNo === 'left') {
      return {
        type: INFO_BUBBLE_TYPE_LEFT_BUILDING
      }
    } else if (nextProps.dataNo === 'right') {
      return {
        type: INFO_BUBBLE_TYPE_RIGHT_BUILDING
      }
    } else {
      return {
        type: INFO_BUBBLE_TYPE_SEGMENT
      }
    }
  }

  componentDidMount () {
    // This listener hides the info bubble when the mouse leaves the
    // document area. Do not normalize it to a pointerleave event
    // because it doesn't make sense for other pointer types
    document.addEventListener('mouseleave', this.hide)
  }

  getSnapshotBeforeUpdate (prevProps, prevState) {
    const wasBuilding = (prevState.type !== INFO_BUBBLE_TYPE_SEGMENT)
    const isBuilding = (this.state.type !== INFO_BUBBLE_TYPE_SEGMENT)

    if (wasBuilding && !isBuilding) {
      return Number.parseInt(this.el.style.left, 10) + (this.el.offsetWidth / 2)
    } else if (!wasBuilding && this.props.dataNo === 'right') {
      return this.props.system.viewportWidth - 50
    }
    return null
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    // If info bubble changes, wake this back up if it's fading out
    cancelFadeoutControls()

    this.updateBubbleDimensions(snapshot)
  }

  componentWillUnmount () {
    // Clean up event listener
    document.removeEventListener('mouseleave', this.hide)
  }

  componentDidCatch (error) {
    console.error(error)
  }

  hide = () => {
    infoBubble.hide()
  }

  onTouchStart (event) {
    resumeFadeoutControls()
  }

  // TODO: verify this continues to work with pointer / touch taps
  onMouseEnter = (event) => {
    if (infoBubble.segmentEl) {
      infoBubble.segmentEl.classList.add('hide-drag-handles-when-inside-info-bubble')
    }

    this.props.setInfoBubbleMouseInside(true)

    infoBubble.updateHoverPolygon()
  }

  onMouseLeave = (event) => {
    // TODO: Prevent pointer taps from flashing the drag handles
    if (infoBubble.segmentEl) {
      infoBubble.segmentEl.classList.remove('hide-drag-handles-when-inside-info-bubble')
    }

    this.props.setInfoBubbleMouseInside(false)

    // Returns focus to body when pointer leaves the info bubble area
    // so that keyboard commands respond to pointer position rather than
    // any focused buttons/inputs
    loseAnyFocus()
  }

  toggleHighlightTriangle = () => {
    this.setState({ highlightTriangle: !this.state.highlightTriangle })
  }

  updateBubbleDimensions = (snapshot) => {
    let bubbleHeight
    if (!this.el) return

    if (this.props.descriptionVisible) {
      const el = this.el.querySelector('.description-canvas')
      const pos = getElAbsolutePos(el)
      bubbleHeight = pos[1] + el.offsetHeight - 38
    } else {
      bubbleHeight = this.el.offsetHeight
    }

    const height = bubbleHeight + 30
    infoBubble.bubbleHeight = bubbleHeight

    this.el.style.webkitTransformOrigin = '50% ' + height + 'px'
    this.el.style.MozTransformOrigin = '50% ' + height + 'px'
    this.el.style.transformOrigin = '50% ' + height + 'px'

    // When the infoBubble needed to be shown for the right building, the offsetWidth
    // used to calculate the left style was from the previous rendering of this component.
    // This meant that if the last time the infoBubble was shown was for a segment, then the
    // offsetWidth used to calculate the new left style would be smaller than it should be.
    // The current solution is to manually recalculate the left style and set the style
    // when hovering over the right building.

    // Now that street segments are being rendered as React components as well, the same issue
    // as above can be seen but vice versa (when switching between hovering over building to
    // a segment). Some calculations are done by the getSnapshotBeforeUpdate function. The new
    // offsetWidth is then added in this function.

    if (snapshot) {
      const bubbleX = (this.state.type === INFO_BUBBLE_TYPE_SEGMENT)
        ? (snapshot - this.el.offsetWidth / 2) : (snapshot - this.el.offsetWidth)
      infoBubble.bubbleX = bubbleX
      this.el.style.left = bubbleX + 'px'
    }
  }

  /**
   * Retrieve name from segment data. It should also find the equivalent strings from the
   * translation files if provided.
   */
  getName = () => {
    let name

    switch (this.state.type) {
      case INFO_BUBBLE_TYPE_SEGMENT: {
        const segment = this.props.street.segments[this.props.dataNo]
        if (segment) {
          const segmentName = getSegmentInfo(segment.type).name
          const segmentVariantName = getSegmentVariantInfo(segment.type, segment.variantString).name
          const segmentType = segment.type
          const segmentVariant = segment.variantString

          // Not all variants have custom names. If the custom segment variant name doesn't exist,
          // then it should use the default name for the segment.
          if (segmentVariantName) {
            name = t(`segments.${segmentType}.details.${segmentVariant}.name`, segmentVariantName, { ns: 'segment-info' })
          } else {
            name = t(`segments.${segmentType}.name`, segmentName, { ns: 'segment-info' })
          }
        }
        break
      }
      case INFO_BUBBLE_TYPE_LEFT_BUILDING: {
        const variantId = this.props.street.leftBuildingVariant
        const backupName = BUILDINGS[variantId].label
        name = t(`buildings.${variantId}.name`, backupName, { ns: 'segment-info' })
        break
      }
      case INFO_BUBBLE_TYPE_RIGHT_BUILDING: {
        const variantId = this.props.street.rightBuildingVariant
        const backupName = BUILDINGS[variantId].label
        name = t(`buildings.${variantId}.name`, backupName, { ns: 'segment-info' })
        break
      }
      default:
        break
    }

    return name
  }

  render () {
    const type = this.state.type
    const canBeDeleted = (type === INFO_BUBBLE_TYPE_SEGMENT)
    const segmentEl = infoBubble.segmentEl

    // Set class names
    const classNames = ['info-bubble']

    classNames.push((type === INFO_BUBBLE_TYPE_SEGMENT) ? 'info-bubble-type-segment' : 'info-bubble-type-building')
    if (this.props.visible) {
      classNames.push('visible')
    }
    if (this.props.descriptionVisible) {
      classNames.push('show-description')
    }

    // Determine position
    let position
    switch (type) {
      case INFO_BUBBLE_TYPE_SEGMENT:
        position = this.props.dataNo
        break
      case INFO_BUBBLE_TYPE_LEFT_BUILDING:
        position = 'left'
        break
      case INFO_BUBBLE_TYPE_RIGHT_BUILDING:
        position = 'right'
        break
      default:
        position = null
        break
    }

    // Determine width or height control type
    let widthOrHeightControl
    switch (type) {
      case INFO_BUBBLE_TYPE_SEGMENT:
        widthOrHeightControl = <WidthControl segmentEl={segmentEl} position={position} />
        break
      case INFO_BUBBLE_TYPE_LEFT_BUILDING:
      case INFO_BUBBLE_TYPE_RIGHT_BUILDING:
        widthOrHeightControl = <BuildingHeightControl position={position} />
        break
      default:
        widthOrHeightControl = null
        break
    }

    const segment = this.props.street.segments[this.props.dataNo]

    return (
      <div
        className={classNames.join(' ')}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onTouchStart={this.onTouchStart}
        ref={(ref) => { this.el = ref }}
      >
        <Triangle highlight={this.state.highlightTriangle} />
        <header>
          <div className="info-bubble-header-label">{this.getName()}</div>
          <RemoveButton enabled={canBeDeleted} segment={segmentEl} />
        </header>
        <div className="info-bubble-controls">
          <Variants type={type} position={position} />
          {widthOrHeightControl}
        </div>
        <Warnings segment={segment} />
        <Description
          description={getDescriptionData(segment)}
          segment={segment}
          updateBubbleDimensions={this.updateBubbleDimensions}
          toggleHighlightTriangle={this.toggleHighlightTriangle}
        />
      </div>
    )
  }
}

function mapStateToProps (state) {
  return {
    visible: state.infoBubble.visible,
    dataNo: state.infoBubble.dataNo,
    descriptionVisible: state.infoBubble.descriptionVisible,
    street: state.street,
    system: state.system
  }
}

function mapDispatchToProps (dispatch) {
  return {
    setInfoBubbleMouseInside: (value) => { dispatch(setInfoBubbleMouseInside(value)) }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(InfoBubble)
