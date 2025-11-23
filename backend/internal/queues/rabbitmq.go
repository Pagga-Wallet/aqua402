package queues

import (
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Queue handles RabbitMQ operations
type Queue struct {
	conn *amqp.Connection
	ch   *amqp.Channel
}

// NewQueue creates a new RabbitMQ queue instance
func NewQueue(url string) (*Queue, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	return &Queue{conn: conn, ch: ch}, nil
}

// Close closes the connection
func (q *Queue) Close() error {
	if q.ch != nil {
		q.ch.Close()
	}
	if q.conn != nil {
		return q.conn.Close()
	}
	return nil
}

// Publish publishes a message to a queue
func (q *Queue) Publish(queueName string, message interface{}) error {
	body, err := json.Marshal(message)
	if err != nil {
		return err
	}

	_, err = q.ch.QueueDeclare(
		queueName, // name
		true,       // durable
		false,      // delete when unused
		false,      // exclusive
		false,      // no-wait
		nil,        // arguments
	)
	if err != nil {
		return err
	}

	return q.ch.Publish(
		"",        // exchange
		queueName, // routing key
		false,     // mandatory
		false,     // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}

// Consume consumes messages from a queue
func (q *Queue) Consume(queueName string, handler func([]byte) error) error {
	_, err := q.ch.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	if err != nil {
		return err
	}

	msgs, err := q.ch.Consume(
		queueName, // queue
		"",        // consumer
		true,      // auto-ack
		false,     // exclusive
		false,     // no-local
		false,     // no-wait
		nil,       // args
	)
	if err != nil {
		return err
	}

	go func() {
		for d := range msgs {
			if err := handler(d.Body); err != nil {
				log.Printf("Error processing message: %v", err)
			}
		}
	}()

	return nil
}

