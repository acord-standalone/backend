const prisma = require("../../db");

async function formatifyFeatureDurations({ userFeatureId, userId }) {
  if (userFeatureId) {
    const userFeature = await prisma.userFeature.findUnique({
      where: {
        id: userFeatureId,
      },
      select: {
        durations: {
          where: {
            consume_end: null,
          }
        },
        current_duration: true,
      },
    });
  
    if (userFeature.current_duration.consume_end.getTime() > Date.now()) return;
  
    if (userFeature.durations.length === 0) {
      await prisma.userFeature.update({
        where: {
          id: userFeatureId,
        },
        data: {
          current_duration: {
            disconnect: true,
          },
          enabled: false,
        }
      });
      return;
    } else {
      const duration = userFeature.durations[0];
      await prisma.userFeature.update({
        where: {
          id: userFeatureId,
        },
        data: {
          current_duration: {
            connect: {
              where: {
                id: duration.id,
              }
            }
          },
          durations: {
            update: {
              where: {
                id: duration.id,
              },
              data: {
                consume_start: new Date(),
                consume_end: new Date(Date.now() + Number(duration.duration)),
              }
            }
          }
        }
      });
    }
  } else if (userId) {
    const userFeatures = await prisma.userFeature.findMany({
      where: {
        user_id: userId,
        enabled: true,
        OR: [
          {
            current_duration: {
              consume_end: null,
            }
          },
          {
            current_duration: null
          },
          {
            current_duration: {
              consume_end: {
                lte: new Date(),
              }
            }
          }
        ],
        // durations: {
        //   some: {
        //     consume_end: null,
        //   }
        // }
      },
      select: {
        id: true,
        durations: {
          where: {
            consume_end: null,
          }
        },
        current_duration: true,
      },
    });
  
    for (const userFeature of userFeatures) {
      if (userFeature.current_duration.consume_end.getTime() > Date.now()) continue;
  
      if (userFeature.durations.length === 0) {
        await prisma.userFeature.update({
          where: {
            id: userFeature.id,
          },
          data: {
            current_duration: {
              disconnect: true,
            },
            enabled: false,
          }
        });
      } else {
        const duration = userFeature.durations[0];
        await prisma.userFeature.update({
          where: {
            id: userFeature.id,
          },
          data: {
            current_duration: {
              connect: {
                where: {
                  id: duration.id,
                }
              }
            },
            durations: {
              update: {
                where: {
                  id: duration.id,
                },
                data: {
                  consume_start: new Date(),
                  consume_end: new Date(Date.now() + Number(duration.duration)),
                }
              }
            }
          }
        });
      }
    }
  } else {
    throw new Error("No user feature id or user id provided.");
  }
}

module.exports = formatifyFeatureDurations;