package swim.plantmonitor;

import swim.api.SwimRoute;
import swim.api.agent.AgentRoute;
import swim.api.plane.AbstractPlane;
import swim.api.space.Space;
import swim.kernel.Kernel;
import swim.server.ServerLoader;
import swim.structure.Value;
import swim.uri.Uri;

import swim.plantmonitor.configUtil.ConfigEnv;

/**
  The ApplicationPlane is the top level of the app.
  This Swim Plane defines the routes to each WebAgent
 */
public class ApplicationPlane extends AbstractPlane {

  /*
    see ../resources/server.recon for web agent definitions
  */

  /**
   * main application loop
   * @param args
   * @throws InterruptedException
   */
  public static void main(String[] args) throws InterruptedException {

    // Load up data in config file
    ConfigEnv.loadConfig();

    // Create the Swim Kernal and Swim Space for our applications
    // The Space and its Wen Agents are defined configured in /resource/server.recon
    final Kernel kernel = ServerLoader.loadServer();
    final Space space = kernel.getSpace("plantmonitor");

    // Startup our Swim Kernal
    kernel.start();
    kernel.run();
    System.out.println("Running Swim Plant Montior Server...");

    // Send the app config to aggregation web agent.
    space.command(Uri.parse("/aggregation"), Uri.parse("setConfig"), ConfigEnv.config);
        
  }
}
