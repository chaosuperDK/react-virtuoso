import * as u from './urx'
import { findMaxKeyValue } from './AATree'
import { domIOSystem } from './domIOSystem'
import { offsetOf, originalIndexFromLocation, sizeSystem } from './sizeSystem'
import { loggerSystem } from './loggerSystem'
import { scrollToIndexSystem } from './scrollToIndexSystem'
import { listStateSystem } from './listStateSystem'
import { ScrollIntoViewLocation } from './interfaces'

export const scrollIntoViewSystem = u.system(
  ([
    { sizes, totalCount, gap },
    { scrollTop, viewportHeight, headerHeight, fixedHeaderHeight, fixedFooterHeight, scrollingInProgress },
    { scrollToIndex },
  ]) => {
    const scrollIntoView = u.stream<ScrollIntoViewLocation>()

    u.connect(
      u.pipe(
        scrollIntoView,
        u.withLatestFrom(sizes, viewportHeight, totalCount, headerHeight, fixedHeaderHeight, fixedFooterHeight, scrollTop),
        u.withLatestFrom(gap),
        u.map(([[viewLocation, sizes, viewportHeight, totalCount, headerHeight, fixedHeaderHeight, fixedFooterHeight, scrollTop], gap]) => {
          const { done, behavior, align, ...rest } = viewLocation
          let location = null
          const actualIndex = originalIndexFromLocation(viewLocation, sizes, totalCount - 1)

          const itemTop = offsetOf(actualIndex, sizes.offsetTree, gap) + headerHeight + fixedHeaderHeight
          if (itemTop < scrollTop + fixedHeaderHeight) {
            location = { ...rest, behavior, align: align ?? 'start' }
          } else {
            const itemBottom = itemTop + findMaxKeyValue(sizes.sizeTree, actualIndex)[1]!

            if (itemBottom > scrollTop + viewportHeight - fixedFooterHeight) {
              location = { ...rest, behavior, align: align ?? 'end' }
            }
          }

          if (location) {
            done &&
              u.handleNext(
                u.pipe(
                  scrollingInProgress,
                  u.skip(1),
                  u.filter((value) => value === false)
                ),
                done
              )
          } else {
            done && done()
          }

          return location
        }),
        u.filter((value) => value !== null)
      ),
      scrollToIndex
    )

    return {
      scrollIntoView,
    }
  },
  u.tup(sizeSystem, domIOSystem, scrollToIndexSystem, listStateSystem, loggerSystem),
  { singleton: true }
)
