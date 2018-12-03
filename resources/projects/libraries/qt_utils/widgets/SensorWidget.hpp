/*
 * Description:  Widget displaying a webots sensor device
 */

#ifndef SENSOR_WIDGET_HPP
#define SENSOR_WIDGET_HPP

#include "DeviceWidget.hpp"

class QCheckBox;

namespace webotsQtUtils {
  class SensorWidget : public DeviceWidget {
    Q_OBJECT

  public:
    SensorWidget(Device *device, QWidget *parent = NULL);
    virtual ~SensorWidget() {}

    virtual void readSensors();

  protected slots:
    virtual void enable(bool enable) = 0;

  protected:
    virtual bool isEnabled() const = 0;

    QCheckBox *mCheckBox;
  };
}  // namespace webotsQtUtils

#endif
