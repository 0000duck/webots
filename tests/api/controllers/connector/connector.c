#include <stdio.h>
#include <webots/connector.h>
#include <webots/robot.h>

#include "../../../lib/ts_assertion.h"
#include "../../../lib/ts_utils.h"

#define TIME_STEP 32

static double t = 0.0; /* time elapsed since simulation start [s] */

int main(int argc, char **argv) {
  ts_setup(argv[0]);

  WbDeviceTag rear_connector = wb_robot_get_device("rear_connector");
  WbDeviceTag front_connector = wb_robot_get_device("front_connector");
  wb_connector_enable_presence(rear_connector, TIME_STEP);
  wb_connector_enable_presence(front_connector, TIME_STEP);

  while (wb_robot_step(TIME_STEP) != -1) {
    if (t == 34 * TIME_STEP) {  // fail with 34
      ts_assert_int_equal(wb_connector_get_presence(rear_connector), 1, "connector presence should be 1");
      wb_connector_unlock(front_connector);
      wb_connector_unlock(rear_connector);
    }
    if (t == 38 * TIME_STEP) {
      ts_assert_int_equal(wb_connector_get_presence(rear_connector), 0, "connector presence should be 0");
      break;
    }
    t += TIME_STEP;
  }
  ts_send_success();
  return EXIT_SUCCESS;
}
