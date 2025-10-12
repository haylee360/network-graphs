
<?php
/**
 * Plugin Name: Network Graph Embed
 * Description: Provides [network_graph] shortcode to embed an interactive Cytoscape.js network viewer and pass color/size options via postMessage.
 * Version: 1.0
 * Author: Generated
 * License: GPL2
 */

if (!defined('ABSPATH')) exit; // Exit if accessed directly

function nge_sanitize_color($c){
    // Simple sanitize for hex colors (allow 3 or 6 hex digits, with leading #)
    if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $c)) return $c;
    return '';
}

function nge_shortcode_network_graph($atts){
    $a = shortcode_atts(array(
        'person_color' => '#51e2f3',
        'company_color' => '#73589a',
        'follows_color' => '#b97e34',
        'worksat_color' => '#7a2550',
        'width' => '100%',
        'height' => '600',
        'background_color' => '#ffffff',
        'path' => '/wp-content/uploads/network-graph/my-graph.html'
    ), $atts, 'network_graph');

    // sanitize colors
    $a['person_color'] = nge_sanitize_color($a['person_color']) ?: '#51e2f3';
    $a['company_color'] = nge_sanitize_color($a['company_color']) ?: '#73589a';
    $a['follows_color'] = nge_sanitize_color($a['follows_color']) ?: '#b97e34';
    $a['worksat_color'] = nge_sanitize_color($a['worksat_color']) ?: '#7a2550';
    $a['background_color'] = nge_sanitize_color($a['background_color']) ?: '#ffffff';

    // sanitize width/height (allow percentages or numbers)
    $width = esc_attr($a['width']);
    $height = esc_attr($a['height']);

    $iframe_id = 'network_graph_iframe_' . uniqid();

    ob_start();
    ?>
    <div class="network-embed-wrapper" style="max-width:100%;">
      <iframe id="<?php echo esc_attr($iframe_id); ?>" src="<?php echo esc_url($a['path']); ?>" style="width:<?php echo $width; ?>; height:<?php echo intval($height); ?>px; border:0;" loading="lazy" title="Interactive network graph"></iframe>
    </div>
    <script type="text/javascript">
    (function(){
      var iframe = document.getElementById(<?php echo json_encode($iframe_id); ?>);
      if(!iframe) return;
      function postColors(){
        var msg = {
          type: 'updateColors',
          nodeTypeColors: {
            'Person': <?php echo json_encode($a['person_color']); ?>,
            'Company': <?php echo json_encode($a['company_color']); ?>
          },
          edgeTypeColors: {
            'FOLLOWS': <?php echo json_encode($a['follows_color']); ?>,
            'WORKS AT': <?php echo json_encode($a['worksat_color']); ?>
          },
          backgroundColor: <?php echo json_encode($a['background_color']); ?>
        };
        try {
          iframe.contentWindow.postMessage(msg, '*');
        } catch(e) {
          console.error('Failed to postMessage to network iframe', e);
        }
      }
      // Wait for iframe load; also attempt a few retries in case of slow loads.
      iframe.addEventListener('load', postColors);
      // In case load already fired or postMessage needs a delayed send, try a fallback.
      setTimeout(postColors, 800);
    })();
    </script>
    <?php
    return ob_get_clean();
}

add_shortcode('network_graph', 'nge_shortcode_network_graph');
